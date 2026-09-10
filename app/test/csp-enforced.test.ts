import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// no-network.test.ts greps our own source for network APIs. It cannot see
// dependencies, index.html or the Rust, and it names the Tauri CSP as the
// backstop that does. That backstop was configured as `null` for the whole
// life of the desktop build, so the headline "no network call" claim in
// README.md and SECURITY.md was enforced by nothing at runtime.
//
// This test exists so that cannot happen quietly again. It asserts the policy
// is present and that the directives which actually carry the promise still
// say 'self'. It does not try to pin the whole string: directives get added as
// the app loads new kinds of asset, and a test that breaks on every legitimate
// addition gets deleted rather than read.

const CONFIG_PATH = join(__dirname, "..", "..", "desktop", "tauri.conf.json");

type TauriConfig = {
  app?: { security?: { csp?: string | null; devCsp?: string | null } };
};

function parseDirectives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name, values);
  }
  return map;
}

describe("Tauri CSP is configured and closed to the network", () => {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as TauriConfig;
  const security = config.app?.security ?? {};

  it("sets a Content-Security-Policy at all", () => {
    expect(
      security.csp,
      "desktop/tauri.conf.json app.security.csp is null or missing, so the webview " +
        "enforces no CSP and the no-network claim has no runtime backstop"
    ).toBeTruthy();
  });

  it("restricts the directives that permit outbound requests", () => {
    const directives = parseDirectives(security.csp as string);

    // The two that decide whether anything can leave the machine. `ipc:` and
    // http://ipc.localhost are Tauri's own command channel, not the network.
    const allowedConnect = new Set(["'self'", "ipc:", "http://ipc.localhost"]);
    for (const value of directives.get("connect-src") ?? []) {
      expect(allowedConnect, `connect-src allows ${value}`).toContain(value);
    }

    expect(directives.get("default-src")).toEqual(["'self'"]);

    // Remote script or object would defeat everything above it.
    expect(directives.get("script-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);

    // Asset directives may carry data:/blob: for local media, but never a
    // remote scheme or a wildcard.
    for (const name of ["img-src", "media-src", "font-src", "style-src"]) {
      for (const value of directives.get(name) ?? []) {
        expect(value, `${name} allows a remote source: ${value}`).not.toMatch(
          /^(https?:|wss?:|\*)/
        );
      }
    }
  });

  it("keeps the dev policy from leaking into the shipped one", () => {
    // devCsp may reach the Vite dev server; csp must never mention localhost.
    expect(security.csp as string).not.toMatch(/localhost:\d+/);
  });
});

describe("updater configuration", () => {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as {
    bundle?: { createUpdaterArtifacts?: boolean };
    plugins?: { updater?: { endpoints?: string[]; pubkey?: string } };
  };
  const updater = config.plugins?.updater;

  it("points at VoidSteps' own GitHub releases and nowhere else", () => {
    expect(updater?.endpoints ?? []).toHaveLength(1);
    expect(updater?.endpoints?.[0]).toMatch(
      /^https:\/\/github\.com\/DevVoidHQ\/VoidSteps\/releases\//
    );
  });

  it("carries a public key, without which every update is refused", () => {
    expect(updater?.pubkey, "no updater public key: signature checks cannot pass").toBeTruthy();
  });

  it("builds the update artifact, without which a release has nothing to serve", () => {
    expect(config.bundle?.createUpdaterArtifacts).toBe(true);
  });
});
