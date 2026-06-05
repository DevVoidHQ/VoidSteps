import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { applyNullableFields, requireOwned } from "./lib/db-helpers";

const recurrenceValidator = v.union(
  v.literal("once"),
  v.literal("yearly"),
  v.literal("monthly")
);

export const getReminders = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createReminder = mutation({
  args: {
    title: v.string(),
    note: v.optional(v.string()),
    recurrence: recurrenceValidator,
    date: v.optional(v.number()),
    month: v.optional(v.number()),
    day: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert("reminders", {
      userId,
      title: args.title,
      note: args.note,
      recurrence: args.recurrence,
      date: args.date,
      month: args.month,
      day: args.day,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReminder = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    note: v.optional(v.union(v.string(), v.null())),
    recurrence: v.optional(recurrenceValidator),
    date: v.optional(v.union(v.number(), v.null())),
    month: v.optional(v.union(v.number(), v.null())),
    day: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, ...updates } = args;
    await requireOwned(ctx, id, userId, "Reminder not found");

    const cleanUpdates: Record<string, any> = { updatedAt: Date.now() };
    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.recurrence !== undefined) cleanUpdates.recurrence = updates.recurrence;
    applyNullableFields(cleanUpdates, updates, ["note", "date", "month", "day"]);

    await ctx.db.patch(id, cleanUpdates);
  },
});

export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Not found");
    await ctx.db.delete(args.id);
  },
});
