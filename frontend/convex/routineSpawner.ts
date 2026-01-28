import { internalMutation } from "./_generated/server";

// Helper to calculate next occurrence based on frequency
function calculateNextOccurrence(
  frequency: string,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number
): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      return tomorrow.getTime();

    case 'weekdays': {
      const next = new Date(tomorrow);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    case 'weekly': {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        const next = new Date(tomorrow);
        next.setDate(next.getDate() + 7);
        return next.getTime();
      }
      const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = tomorrow.getDay();
      let nextDay = sortedDays.find(d => d >= currentDay);
      const next = new Date(tomorrow);
      if (nextDay !== undefined && nextDay > currentDay) {
        next.setDate(next.getDate() + (nextDay - currentDay));
      } else {
        nextDay = sortedDays[0];
        next.setDate(next.getDate() + (7 - currentDay + nextDay));
      }
      return next.getTime();
    }

    case 'monthly': {
      const day = dayOfMonth || now.getDate();
      const next = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      while (next.getDate() !== day) {
        next.setDate(0);
      }
      return next.getTime();
    }

    case 'yearly': {
      const m = (month || 1) - 1;
      const d = dayOfYear || 1;
      const next = new Date(now.getFullYear(), m, d, 0, 0, 0, 0);
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next.getTime();
    }

    default:
      return tomorrow.getTime();
  }
}

// Internal mutation to spawn steps from routines
export const spawnDueSteps = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all routines that are due
    const allRoutines = await ctx.db.query("routines").collect();
    const dueRoutines = allRoutines.filter(routine => routine.nextOccurrence <= now);

    // Spawn a new step for each due routine
    for (const routine of dueRoutines) {
      // Create the new step from routine blueprint
      await ctx.db.insert("steps", {
        title: routine.title,
        description: routine.description,
        completed: false,
        failed: false,
        pathId: routine.pathId,
        parentId: undefined,
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
    }

    return { spawned: dueRoutines.length };
  },
});
