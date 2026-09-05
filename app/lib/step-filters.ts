import type { Step } from "@/types/index";

/** A step's path id, whichever shape the row carries it in. */
export function getStepPathId(step: Step): string | null {
  return step.path?._id || (typeof step.pathId === "string" ? step.pathId : null);
}

/**
 * Filters a list by the search box and the path dropdown. Selecting a path
 * matches its descendants too, so filtering by a parent shows the whole branch.
 */
export function filterSteps(
  steps: Step[],
  searchQuery: string,
  pathFilter: string,
  descendantPathIds: Set<string>
): Step[] {
  const query = searchQuery.toLowerCase();
  return steps.filter((step) => {
    const matchesSearch =
      !searchQuery ||
      step.title.toLowerCase().includes(query) ||
      (step.description || "").toLowerCase().includes(query);

    const pathId = getStepPathId(step);
    const matchesPath = !pathFilter || (pathId ? descendantPathIds.has(pathId) : false);

    return matchesSearch && matchesPath;
  });
}
