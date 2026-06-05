import { internalMutation } from "./_generated/server";
import { getStartOfToday } from "./lib/db-helpers";
import { calculateNextOccurrence } from "./lib/recurrence";

// Internal mutation to spawn steps from routines
export const spawnDueSteps = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Compute start of today (midnight) for dedup window
    const startOfTodayMs = getStartOfToday(now);

    // Get all routines that are due
    const allRoutines = await ctx.db.query("routines").collect();
    const dueRoutines = allRoutines.filter(routine => routine.nextOccurrence <= now);

    let spawned = 0;

    // Spawn a new step for each due routine
    for (const routine of dueRoutines) {
      // Dedup: skip if a step for this routine already exists today
      const existingStep = await ctx.db
        .query("steps")
        .withIndex("by_routine", (q) => q.eq("routineId", routine._id))
        .filter((q) => q.gte(q.field("createdAt"), startOfTodayMs))
        .first();

      if (existingStep) {
        continue;
      }

      // Create the new step from routine blueprint, propagating userId
      await ctx.db.insert("steps", {
        userId: routine.userId,
        title: routine.title,
        description: routine.description,
        completed: false,
        failed: false,
        pathId: routine.pathId,
        routineId: routine._id,
        prioritizedToday: routine.autoPrioritize ?? false,
        sortOrder: now,
        dueDate: undefined,
        startDate: undefined,
        createdAt: now,
        updatedAt: now,
      });

      // Update the routine's nextOccurrence
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear
      );

      await ctx.db.patch(routine._id, {
        nextOccurrence,
        updatedAt: now,
      });

      spawned++;
    }

    return { spawned };
  },
});
