import { describe, expect, it } from "vitest";
import { resolveSlot, shiftEndWithStart, toTimeValue } from "@/lib/time-slot";

const day = new Date(2026, 8, 23).setHours(0, 0, 0, 0);

describe("resolveSlot", () => {
  it("applies both clock values to the day the slot belongs to", () => {
    const slot = resolveSlot(day, "09:30", "11:00")!;
    expect(new Date(slot.start).getHours()).toBe(9);
    expect(new Date(slot.start).getMinutes()).toBe(30);
    expect(new Date(slot.end).getHours()).toBe(11);
    expect(new Date(slot.start).getDate()).toBe(new Date(day).getDate());
  });

  it("derives the duration from the two times", () => {
    const slot = resolveSlot(day, "09:30", "11:00")!;
    expect(slot.end - slot.start).toBe(90 * 60 * 1000);
  });

  it("rolls an end that is not after the start into the next day", () => {
    // "22:00 to 01:00" is a real overnight session, not an error.
    const slot = resolveSlot(day, "22:00", "01:00")!;
    expect(slot.end - slot.start).toBe(3 * 60 * 60 * 1000);
    expect(new Date(slot.end).getDate()).toBe(new Date(day).getDate() + 1);
  });

  it("treats an equal start and end as a full day rather than zero", () => {
    const slot = resolveSlot(day, "09:00", "09:00")!;
    expect(slot.end - slot.start).toBe(24 * 60 * 60 * 1000);
  });

  it("returns undefined when a value is not a time", () => {
    expect(resolveSlot(day, "", "11:00")).toBeUndefined();
    expect(resolveSlot(day, "09:00", "")).toBeUndefined();
  });
});

describe("toTimeValue", () => {
  it("renders a zero-padded local clock value", () => {
    expect(toTimeValue(new Date(2026, 8, 23, 9, 5).getTime())).toBe("09:05");
    expect(toTimeValue(new Date(2026, 8, 23, 14, 30).getTime())).toBe("14:30");
  });
});

describe("shiftEndWithStart", () => {
  it("moves the end by as much as the start moved, keeping the length", () => {
    expect(shiftEndWithStart("13:23", "13:00", "13:33")).toBe("13:10");
    expect(shiftEndWithStart("09:30", "10:15", "11:00")).toBe("11:45");
  });

  it("wraps past midnight so an overnight block stays the same length", () => {
    expect(shiftEndWithStart("22:00", "23:30", "23:45")).toBe("01:15");
    expect(shiftEndWithStart("00:30", "23:30", "01:00")).toBe("00:00");
  });

  it("leaves the end alone while the start is still being typed", () => {
    expect(shiftEndWithStart("13:23", "", "13:33")).toBe("13:33");
    expect(shiftEndWithStart("", "13:00", "13:33")).toBe("13:33");
  });
});
