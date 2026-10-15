/** Local clock value ("14:05") for a timestamp. */
export function toTimeValue(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Applies a "HH:MM" clock value to the calendar day `onDay` falls in. */
function withTime(onDay: number, value: string): number | undefined {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
  const d = new Date(onDay);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * Resolves a start/end pair on a given day.
 *
 * An end at or before the start rolls to the next day rather than erroring:
 * "22:00 to 01:00" is a real session, and asking for a date on every edit is
 * exactly the friction this editor exists to remove.
 */
export function resolveSlot(
  day: number,
  startValue: string,
  endValue: string
): { start: number; end: number } | undefined {
  const start = withTime(day, startValue);
  let end = withTime(day, endValue);
  if (start === undefined || end === undefined) return undefined;
  if (end <= start) end += 24 * 60 * 60 * 1000;
  return { start, end };
}

function minutesOf(value: string): number | undefined {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
  return h * 60 + m;
}

/**
 * The end value after the start moves from `prevStart` to `nextStart`, keeping
 * the slot's length. Moving the start moves the whole block; changing the
 * length is what editing the end is for. Wraps around midnight, so the
 * overnight rule in resolveSlot still applies. Returns `end` unchanged while
 * either start value is incomplete (a time field mid-typing reports "").
 */
export function shiftEndWithStart(prevStart: string, nextStart: string, end: string): string {
  const from = minutesOf(prevStart);
  const to = minutesOf(nextStart);
  const at = minutesOf(end);
  if (from === undefined || to === undefined || at === undefined) return end;
  const day = 24 * 60;
  const shifted = (((at + to - from) % day) + day) % day;
  return `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(shifted % 60).padStart(2, "0")}`;
}
