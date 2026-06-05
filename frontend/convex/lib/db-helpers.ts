// Shared server-side query/mutation helpers. Kept tiny and dependency-free so
// any Convex function can pull them in without bundling surprises.

// Midnight (local server clock) as a ms timestamp. Used for "created today"
// dedup windows and start-of-day comparisons.
export function getStartOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Fetch a doc and assert the caller owns it, else throw. Returns the doc so
// callers don't re-fetch. `notFoundMessage` is passed through verbatim to keep
// existing error strings (some tests/clients key off them).
export async function requireOwned(
  ctx: { db: { get: (id: any) => Promise<any> } },
  id: any,
  userId: string,
  notFoundMessage: string
): Promise<any> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.userId !== userId) throw new Error(notFoundMessage);
  return doc;
}

// Copy `keys` from `updates` into `patch`, treating an explicit null as "clear"
// (undefined). Skips keys the caller didn't send (undefined in updates).
export function applyNullableFields(
  patch: Record<string, any>,
  updates: Record<string, any>,
  keys: string[]
): void {
  for (const key of keys) {
    if (updates[key] !== undefined) {
      patch[key] = updates[key] === null ? undefined : updates[key];
    }
  }
}
