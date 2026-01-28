import { mutation } from "./_generated/server";

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
