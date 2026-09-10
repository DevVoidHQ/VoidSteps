import { describe, it, expect } from "vitest";
import {
  getEffectiveTimeMs,
  formatDurationHM,
  startOfDay,
  generateDayRange,
} from "./analytics-utils";

describe("getEffectiveTimeMs", () => {
  it("returns tracked time unchanged", () => {
    expect(getEffectiveTimeMs(90 * 60_000)).toBe(90 * 60_000);
  });

  // This used to return 15 minutes, which invented hours of work out of a
  // long list of untracked steps.
  it("counts an untracked step as zero", () => {
    expect(getEffectiveTimeMs(undefined)).toBe(0);
    expect(getEffectiveTimeMs(0)).toBe(0);
  });
});

describe("formatDurationHM", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationHM(135 * 60_000)).toBe("2h 15m");
    expect(formatDurationHM(120 * 60_000)).toBe("2h");
    expect(formatDurationHM(45 * 60_000)).toBe("45m");
    expect(formatDurationHM(0)).toBe("0m");
  });
});

describe("day helpers", () => {
  it("truncates to local midnight", () => {
    const noon = new Date(2026, 6, 8, 12, 30, 15).getTime();
    expect(startOfDay(noon)).toBe(new Date(2026, 6, 8).getTime());
  });

  it("generates an inclusive range ending today", () => {
    const days = generateDayRange(7);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(startOfDay(Date.now()));
  });
});
