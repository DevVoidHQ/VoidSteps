import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// VoidSteps' headline privacy claim (README.md, CONTRIBUTING.md, SECURITY.md)
// is that it makes zero network calls: everything lives in local IndexedDB.
// Nothing else in the build enforces that, so this is the guard.
//
// What it covers: a text sweep of app/ source and stylesheets for the APIs
// that reach the network, plus remote url() and @import in CSS. The CSS half
// matters more than it looks: pulling a webfont from a CDN is one line, is
// invisible in review, and would break the claim on the very surface this
// app cares most about.
//
// What it deliberately does NOT cover, so nobody mistakes green for proof:
// index.html (outside app/), the Rust in desktop/, and third-party packages.
// The Tauri CSP is the backstop for dependencies. Indirect forms such as
// aliasing globalThis.fetch, or assigning a remote URL to an Image src, also
// slip past a text scan. This raises the cost of a mistake; it is not a sandbox.

const SRC_ROOT = join(__dirname, "..");

const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css"];

const NETWORK_PATTERNS: RegExp[] = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /navigator\s*\.\s*sendBeacon\b/,
  /\bEventSource\b/,
  /\bRTCPeerConnection\b/,
  /navigator\s*\.\s*serviceWorker\b/,
  /\bimport\s+[^'"]*['"]https?:\/\//, // import ... from 'http(s)://...'
  /\bimport\s*\(\s*['"]https?:\/\//, // dynamic import('http(s)://...')
  /\burl\(\s*['"]?https?:\/\//i, // CSS url(https://...), e.g. a CDN webfont
  /@import\s+(?:url\()?\s*['"]https?:\/\//i, // CSS @import of a remote sheet
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (!SCANNED_EXTENSIONS.includes(extname(full))) continue;
    if (/\.test\.[tj]sx?$/.test(full)) continue;
    if (full.startsWith(join(SRC_ROOT, "test"))) continue;
    files.push(full);
  }
  return files;
}

describe("no network calls anywhere in src", () => {
  it("never references a network-calling API or an http(s) import", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const contents = readFileSync(file, "utf8");
      for (const pattern of NETWORK_PATTERNS) {
        if (pattern.test(contents)) {
          offenders.push(`${file}: matched ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
