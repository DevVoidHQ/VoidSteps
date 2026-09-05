import type { Path } from "@/types";

/**
 * Returns a Set containing the given pathId and all its descendant path IDs.
 * If pathId is empty/falsy, returns an empty set.
 */
export function getDescendantPathIds(pathId: string, paths: Path[]): Set<string> {
  if (!pathId) return new Set();

  const ids = new Set<string>([pathId]);
  let added = true;

  while (added) {
    added = false;
    for (const path of paths) {
      if (path.parentId && ids.has(path.parentId) && !ids.has(path._id)) {
        ids.add(path._id);
        added = true;
      }
    }
  }

  return ids;
}
