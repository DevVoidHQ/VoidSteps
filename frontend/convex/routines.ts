import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const getRoutines = query({
  handler: async (ctx) => {
    const routines = await ctx.db.query("routines").collect();

    // Enrich with path info
    const enriched = await Promise.all(
      routines.map(async (routine) => {
        let path = null;
        if (routine.pathId) {
          path = await ctx.db.get(routine.pathId);
        }
        return { ...routine, path };
      })
    );

    return enriched;
  },
});

export const createRoutine = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    pathId: v.optional(v.id("paths")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekdays"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    ),
    daysOfWeek: v.optional(v.array(v.number())),
    dayOfMonth: v.optional(v.number()),
    month: v.optional(v.number()),
    dayOfYear: v.optional(v.number()),
    autoPrioritize: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nextOccurrence = calculateNextOccurrence(
      args.frequency,
      args.daysOfWeek,
      args.dayOfMonth,
      args.month,
      args.dayOfYear
    );

    return await ctx.db.insert("routines", {
      title: args.title,
      description: args.description,
      pathId: args.pathId,
      frequency: args.frequency,
      daysOfWeek: args.daysOfWeek,
      dayOfMonth: args.dayOfMonth,
      month: args.month,
      dayOfYear: args.dayOfYear,
      nextOccurrence,
      autoPrioritize: args.autoPrioritize,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRoutine = mutation({
  args: {
    id: v.id("routines"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    pathId: v.optional(v.union(v.id("paths"), v.null())),
    frequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekdays"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly")
      )
    ),
    daysOfWeek: v.optional(v.union(v.array(v.number()), v.null())),
    dayOfMonth: v.optional(v.union(v.number(), v.null())),
    month: v.optional(v.union(v.number(), v.null())),
    dayOfYear: v.optional(v.union(v.number(), v.null())),
    autoPrioritize: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Routine not found");

    const cleanUpdates: Record<string, any> = { updatedAt: Date.now() };

    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.pathId !== undefined) cleanUpdates.pathId = updates.pathId === null ? undefined : updates.pathId;
    if (updates.frequency !== undefined) cleanUpdates.frequency = updates.frequency;
    if (updates.daysOfWeek !== undefined) cleanUpdates.daysOfWeek = updates.daysOfWeek === null ? undefined : updates.daysOfWeek;
    if (updates.dayOfMonth !== undefined) cleanUpdates.dayOfMonth = updates.dayOfMonth === null ? undefined : updates.dayOfMonth;
    if (updates.month !== undefined) cleanUpdates.month = updates.month === null ? undefined : updates.month;
    if (updates.dayOfYear !== undefined) cleanUpdates.dayOfYear = updates.dayOfYear === null ? undefined : updates.dayOfYear;
    if (updates.autoPrioritize !== undefined) cleanUpdates.autoPrioritize = updates.autoPrioritize;

    // Recalculate nextOccurrence if frequency or schedule changed
    if (updates.frequency || updates.daysOfWeek !== undefined || updates.dayOfMonth !== undefined || updates.month !== undefined || updates.dayOfYear !== undefined) {
      const frequency = updates.frequency || existing.frequency;
      const daysOfWeek = updates.daysOfWeek === null ? undefined : (updates.daysOfWeek || existing.daysOfWeek);
      const dayOfMonth = updates.dayOfMonth === null ? undefined : (updates.dayOfMonth || existing.dayOfMonth);
      const month = updates.month === null ? undefined : (updates.month || existing.month);
      const dayOfYear = updates.dayOfYear === null ? undefined : (updates.dayOfYear || existing.dayOfYear);

      cleanUpdates.nextOccurrence = calculateNextOccurrence(frequency, daysOfWeek, dayOfMonth, month, dayOfYear);
    }

    await ctx.db.patch(id, cleanUpdates);
  },
});

export const deleteRoutine = mutation({
  args: { id: v.id("routines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
