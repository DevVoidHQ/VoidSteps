import { getLogicalDayStart, type DayBoundaryOpts } from "./calculate-next-occurrence";
import { parseDateInput } from "./date-utils";
import { parseDateToken } from "./quick-capture";

/**
 * Postponing a step moves its due date forward. It leaves the start date and
 * the timer alone. The priority star is not touched here either: `updateStep`
 * drops it for any due date moved past today, when that setting is on.
 *
 * Targets deliberately reuse the `@token` vocabulary from quick capture rather
 * than defining a second one, so "this weekend" means the same day whether you
 * typed it while creating the step or picked it while postponing.
 */
export const POSTPONE_TARGETS = [
  { token: "tomorrow", label: "Tomorrow" },
  { token: "weekend", label: "This weekend" },
  { token: "nextweek", label: "In a week" },
] as const;

export type PostponeToken = (typeof POSTPONE_TARGETS)[number]["token"];

/**
 * Resolves a postpone target to a due-date timestamp (end of that day).
 *
 * **Relative to today, never to the step's existing due date.** This is the
 * whole point: postponing a step that was due last Tuesday by "tomorrow" must
 * land tomorrow, not last Wednesday. Anchoring on the stale due date would
 * leave an overdue step still overdue, which is exactly the case people reach
 * for postpone in.
 *
 * A step with no due date gets one, so the same action covers deferring and
 * scheduling.
 */
export function resolvePostponeDate(token: string): number | undefined {
  const iso = parseDateToken(token);
  return iso ? parseDateInput(iso) : undefined;
}

/**
 * Whether a due date falls on a later day than today, by the same logical day
 * (end-of-day turnover included) that Today uses. Compares day starts rather
 * than adding 24h, so a DST change cannot shift the boundary.
 */
export function isAfterToday(dueDate: number, now: number, opts?: DayBoundaryOpts): boolean {
  return getLogicalDayStart(dueDate, opts) > getLogicalDayStart(now, opts);
}
