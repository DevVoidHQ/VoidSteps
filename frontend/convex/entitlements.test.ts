import { describe, it, expect } from "vitest";
import { can, planOf, canUseTheme, FREE_THEMES } from "./lib/entitlements";

describe("planOf", () => {
  it("normalizes known plans", () => {
    expect(planOf({ plan: "pro" })).toBe("pro");
    expect(planOf({ plan: "lifetime" })).toBe("lifetime");
    expect(planOf({ plan: "free" })).toBe("free");
  });

  it("defaults unknown / missing / malformed to free", () => {
    expect(planOf({ plan: "enterprise" })).toBe("free");
    expect(planOf({})).toBe("free");
    expect(planOf(null)).toBe("free");
    expect(planOf(undefined)).toBe("free");
  });
});

describe("can", () => {
  it("free has no gated features", () => {
    for (const f of ["sync", "notes", "analytics", "themes.custom"] as const) {
      expect(can("free", f)).toBe(false);
    }
  });

  it("pro and lifetime have every gated feature", () => {
    for (const plan of ["pro", "lifetime"] as const) {
      for (const f of ["sync", "notes", "analytics", "themes.custom"] as const) {
        expect(can(plan, f)).toBe(true);
      }
    }
  });
});

describe("canUseTheme", () => {
  it("free may only apply the free presets", () => {
    for (const name of FREE_THEMES) expect(canUseTheme("free", name)).toBe(true);
    expect(canUseTheme("free", "cyberpunk")).toBe(false);
    expect(canUseTheme("free", "dracula")).toBe(false);
  });

  it("paid plans may apply any preset", () => {
    expect(canUseTheme("pro", "cyberpunk")).toBe(true);
    expect(canUseTheme("lifetime", "synthwave")).toBe(true);
  });
});
