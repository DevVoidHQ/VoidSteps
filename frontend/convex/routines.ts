import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { applyNullableFields, requireOwned } from "./lib/db-helpers";
import { calculateNextOccurrence } from "./lib/recurrence";

export const getRoutines = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const routines = await ctx.db.query("routines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const nextOccurrence = calculateNextOccurrence(
      args.frequency,
      args.daysOfWeek,
      args.dayOfMonth,
      args.month,
      args.dayOfYear
    );

    return await ctx.db.insert("routines", {
      userId,
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
    const userId = await requireAuth(ctx);
    const { id, ...updates } = args;
    const existing = await requireOwned(ctx, id, userId, "Routine not found");

    const cleanUpdates: Record<string, any> = { updatedAt: Date.now() };

    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.frequency !== undefined) cleanUpdates.frequency = updates.frequency;
    if (updates.autoPrioritize !== undefined) cleanUpdates.autoPrioritize = updates.autoPrioritize;
    applyNullableFields(cleanUpdates, updates, ["pathId", "daysOfWeek", "dayOfMonth", "month", "dayOfYear"]);

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
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Not found");
    await ctx.db.delete(args.id);
  },
});
