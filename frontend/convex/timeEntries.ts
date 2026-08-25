import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Time entries never ride the full-table pull (an append-only log would make
// every 60s pull O(all history)). Clients pull incrementally: rows whose
// server-stamped updatedAt is >= their persisted cursor, paginated. `gte` (not
// gt) so rows written in the same millisecond the cursor was captured are
// re-sent rather than skipped - the client merge is an idempotent upsert.
export const listSince = query({
  args: { since: v.number(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("timeEntries")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gte("updatedAt", args.since))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
