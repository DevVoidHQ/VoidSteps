import type { Path, Step } from "@/types/index";
import { getDescendantPathIds } from "./path-utils";

/**
 * The lens: one app-wide filter that every view looks through. Today, Steps,
 * Paths, Calendar, Day log, Analytics, Routines and the command bar all show
 * only what matches it. Sorting stays per view; the lens decides what is in.
 *
 * Within a dimension the choices are ORed (overdue OR due today), across
 * dimensions they are ANDed (Work paths AND due this week). An empty
 * dimension does not filter.
 */
export type DueFilter = "overdue" | "today" | "week" | "none";
export type KindFilter = "all" | "oneoff" | "routine";
export type StarFilter = "all" | "starred" | "unstarred";

export interface Lens {
  /** Selected paths; each also takes in its sub-paths. */
  pathIds: string[];
  due: DueFilter[];
  kind: KindFilter;
  starred: StarFilter;
}

export interface SavedLens {
  id: string;
  name: string;
  lens: Lens;
}

export const EMPTY_LENS: Lens = { pathIds: [], due: [], kind: "all", starred: "all" };

export const DUE_LABELS: Record<DueFilter, string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  none: "No due date",
};

export const KIND_LABELS: Record<Exclude<KindFilter, "all">, string> = {
  oneoff: "One-off steps",
  routine: "From routines",
};

export const STAR_LABELS: Record<Exclude<StarFilter, "all">, string> = {
  starred: "Starred",
  unstarred: "Not starred",
};

export function isLensActive(lens: Lens): boolean {
  return (
    lens.pathIds.length > 0 || lens.due.length > 0 || lens.kind !== "all" || lens.starred !== "all"
  );
}

/** Selected paths plus all their sub-paths, or undefined when paths do not filter. */
export function lensPathIds(lens: Lens, paths: Path[]): Set<string> | undefined {
  if (lens.pathIds.length === 0) return undefined;
  const ids = new Set<string>();
  for (const id of lens.pathIds) for (const d of getDescendantPathIds(id, paths)) ids.add(d);
  return ids;
}

const DAY = 24 * 60 * 60 * 1000;

function dueBucket(dueDate: number | undefined, now: number): DueFilter[] {
  if (dueDate === undefined) return ["none"];
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const tomorrowStart = todayStart + DAY;
  if (dueDate < todayStart) return ["overdue"];
  if (dueDate < tomorrowStart) return ["today", "week"];
  if (dueDate < todayStart + 7 * DAY) return ["week"];
  return [];
}

/** Whether a step is inside the lens. `pathIds` comes from lensPathIds, computed once. */
export function stepInLens(
  step: Step,
  lens: Lens,
  pathIds: Set<string> | undefined,
  now: number
): boolean {
  if (pathIds && !(step.pathId && pathIds.has(step.pathId))) return false;
  if (lens.due.length > 0) {
    const buckets = dueBucket(step.dueDate, now);
    if (!lens.due.some((d) => buckets.includes(d))) return false;
  }
  if (lens.kind === "routine" && !step.routineId) return false;
  if (lens.kind === "oneoff" && step.routineId) return false;
  if (lens.starred === "starred" && !step.prioritizedToday) return false;
  if (lens.starred === "unstarred" && step.prioritizedToday) return false;
  return true;
}

/**
 * ⌘ number keys: ⌘1 is always Everything, so there is one key out of any lens;
 * ⌘2 to ⌘9 are the first eight saved lenses, in their saved order.
 */
export const EVERYTHING_DIGIT = 1;

/** The ⌘ digit for the saved lens at `index`, or undefined past the eighth. */
export function lensDigit(index: number): number | undefined {
  return index < 8 ? index + 2 : undefined;
}

/** What ⌘`digit` switches to: null for Everything, a lens id, or undefined for nothing. */
export function lensForDigit(digit: number, saved: { id: string }[]): string | null | undefined {
  if (digit === EVERYTHING_DIGIT) return null;
  return saved[digit - 2]?.id;
}

/** Reads a stored lens defensively: anything malformed falls back to empty. */
export function parseLens(raw: unknown): Lens {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LENS };
  const r = raw as Partial<Lens>;
  const dueValues = Object.keys(DUE_LABELS);
  return {
    pathIds: Array.isArray(r.pathIds) ? r.pathIds.filter((x) => typeof x === "string") : [],
    due: Array.isArray(r.due) ? (r.due.filter((d) => dueValues.includes(d)) as DueFilter[]) : [],
    kind: r.kind === "oneoff" || r.kind === "routine" ? r.kind : "all",
    starred: r.starred === "starred" || r.starred === "unstarred" ? r.starred : "all",
  };
}
