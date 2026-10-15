import type { Path, Step } from "@/types/index";

/**
 * Per-view sorting. "manual" keeps the drag order the steps arrive in; the
 * rest are views that never touch that order.
 */
export type StepSort = "manual" | "due" | "path" | "newest" | "title";

export const STEP_SORTS: { value: StepSort; label: string }[] = [
  { value: "manual", label: "My order" },
  { value: "due", label: "Due date" },
  { value: "path", label: "Path" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
];

export function sortSteps(steps: Step[], sort: StepSort, paths: Path[]): Step[] {
  if (sort === "manual") return steps;
  const sorted = [...steps];
  // Ties fall back to the manual order, which is the incoming order.
  const index = new Map(steps.map((s, i) => [s._id, i]));
  const tie = (a: Step, b: Step) => index.get(a._id)! - index.get(b._id)!;
  if (sort === "due") {
    // Soonest first, undated last.
    sorted.sort(
      (a, b) =>
        (a.dueDate ?? Number.POSITIVE_INFINITY) - (b.dueDate ?? Number.POSITIVE_INFINITY) ||
        tie(a, b)
    );
  } else if (sort === "path") {
    const title = new Map(paths.map((p) => [p._id, p.title.toLowerCase()]));
    const key = (s: Step) => (s.pathId && title.get(s.pathId)) || "￿";
    sorted.sort((a, b) => key(a).localeCompare(key(b)) || tie(a, b));
  } else if (sort === "newest") {
    sorted.sort((a, b) => Number(b.createdAt) - Number(a.createdAt) || tie(a, b));
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }
  return sorted;
}
