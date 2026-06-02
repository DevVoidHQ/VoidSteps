import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Backfill userId on all existing records (run once after first Clerk sign-in)
export const backfillUserId = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const tables = ["steps", "paths", "routines"] as const;
    let total = 0;
    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        if (!record.userId) {
          await ctx.db.patch(record._id, { userId } as any);
          total++;
        }
      }
    }
    return { backfilled: total };
  },
});

// One-time migration to clean up interval field from recurring object
export const cleanupLegacyFields = mutation({
  handler: async (ctx) => {
    const allSteps = await ctx.db.query("steps").collect();

    let updated = 0;
    for (const step of allSteps) {
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      // Clean up recurring.interval if present
      if (step.recurring && 'interval' in (step.recurring as any)) {
        const { interval, ...cleanRecurring } = step.recurring as any;
        updates.recurring = cleanRecurring;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(step._id, updates);
        updated++;
      }
    }

    return { updated, total: allSteps.length };
  },
});

// Migration to clean up recurring and recurringSourceId fields from steps
// (for separating routines into their own table)
export const cleanupRecurringFields = mutation({
  handler: async (ctx) => {
    const allSteps = await ctx.db.query("steps").collect();

    let updated = 0;
    for (const step of allSteps) {
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      // Remove recurring field if present
      if ('recurring' in step) {
        updates.recurring = undefined;
        needsUpdate = true;
      }

      // Remove recurringSourceId field if present
      if ('recurringSourceId' in step) {
        updates.recurringSourceId = undefined;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(step._id, updates);
        updated++;
      }
    }

    return { updated, total: allSteps.length };
  },
});
