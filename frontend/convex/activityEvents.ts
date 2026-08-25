import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Same incremental cursor pull as timeEntries.listSince (see the notes there):
// append-only tables must never be pulled as full snapshots.
export const listSince = query({
  args: { since: v.number(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("activityEvents")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gte("updatedAt", args.since))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
