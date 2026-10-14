import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAfterToday, POSTPONE_TARGETS, resolvePostponeDate } from "./postpone";

// Wed 2026-09-02, mid-morning local.
const WEDNESDAY = new Date(2026, 8, 2, 10, 0, 0);

function dayOf(ts: number) {
  const d = new Date(ts);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()] as const;
}

describe("resolvePostponeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(WEDNESDAY);
  });
  afterEach(() => vi.useRealTimers());

  it("resolves tomorrow to the next calendar day", () => {
    expect(dayOf(resolvePostponeDate("tomorrow")!)).toEqual([2026, 9, 3]);
  });

  it("resolves in a week to seven days out", () => {
    expect(dayOf(resolvePostponeDate("nextweek")!)).toEqual([2026, 9, 9]);
  });

  it("resolves this weekend to the coming Saturday", () => {
    const ts = resolvePostponeDate("weekend")!;
    expect(new Date(ts).getDay()).toBe(6);
    expect(dayOf(ts)).toEqual([2026, 9, 5]);
  });

  it("lands at end of day, matching how due dates are stored", () => {
    const d = new Date(resolvePostponeDate("tomorrow")!);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([23, 59, 59]);
  });

  it("returns undefined for a token it does not know", () => {
    expect(resolvePostponeDate("someday")).toBeUndefined();
  });

  // The rule the whole feature turns on.
  describe("anchoring", () => {
    it("computes from today, not from a stale due date", () => {
      // A step due last Tuesday. Postponing by a day must not land last
      // Wednesday, which would leave it overdue.
      const lastTuesday = new Date(2026, 7, 25, 23, 59, 59, 999).getTime();
      const postponed = resolvePostponeDate("tomorrow")!;

      expect(postponed).toBeGreaterThan(lastTuesday);
      expect(postponed).toBeGreaterThan(Date.now());
      expect(dayOf(postponed)).toEqual([2026, 9, 3]);
    });

    it("puts every target in the future for an overdue step", () => {
      for (const { token } of POSTPONE_TARGETS) {
        expect(resolvePostponeDate(token)!).toBeGreaterThan(Date.now());
      }
    });

    it("gives an undated step a due date", () => {
      // No prior due date is involved in the calculation at all, so the
      // undated case is the same code path and cannot diverge.
      expect(resolvePostponeDate("tomorrow")).toBeTypeOf("number");
    });
  });

  it("offers only forward-looking targets", () => {
    for (const { token } of POSTPONE_TARGETS) {
      expect(resolvePostponeDate(token)!).toBeGreaterThan(Date.now());
    }
    expect(POSTPONE_TARGETS.map((t) => t.token)).not.toContain("yesterday");
  });
});

describe("isAfterToday", () => {
  const now = WEDNESDAY.getTime();

  it("is false for any time today", () => {
    expect(isAfterToday(new Date(2026, 8, 2, 23, 59, 59, 999).getTime(), now)).toBe(false);
    expect(isAfterToday(new Date(2026, 8, 2, 0, 0, 0).getTime(), now)).toBe(false);
  });

  it("is false for an earlier day", () => {
    expect(isAfterToday(new Date(2026, 8, 1, 23, 59, 59, 999).getTime(), now)).toBe(false);
  });

  it("is true from the start of tomorrow", () => {
    expect(isAfterToday(new Date(2026, 8, 3, 0, 0, 0).getTime(), now)).toBe(true);
    expect(isAfterToday(new Date(2026, 8, 3, 23, 59, 59, 999).getTime(), now)).toBe(true);
  });

  it("follows the end-of-day turnover, like Today does", () => {
    // 01:00 with a 03:00 turnover still belongs to yesterday, so the current
    // calendar date is already a later day.
    const oneAm = new Date(2026, 8, 2, 1, 0, 0).getTime();
    const opts = { turnoverMinutes: 180 };
    expect(isAfterToday(new Date(2026, 8, 2, 23, 59, 59, 999).getTime(), oneAm, opts)).toBe(true);
    expect(isAfterToday(new Date(2026, 8, 2, 2, 0, 0).getTime(), oneAm, opts)).toBe(false);
  });
});
