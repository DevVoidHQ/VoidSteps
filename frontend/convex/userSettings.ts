import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Get all user settings (for sync)
export const getAllUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get user settings
export const getUserSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const authedUserId = await requireAuth(ctx);
    if (userId !== authedUserId) throw new Error("Unauthorized");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings;
  },
});

// Update or create user settings. Every field is optional and only provided
// fields are written, so a theme-only push can't clobber day settings and
// vice-versa.
export const updateUserSettings = mutation({
  args: {
    userId: v.string(),
    theme: v.optional(v.object({
      background: v.string(),
      foreground: v.string(),
      card: v.string(),
      cardForeground: v.string(),
      popover: v.string(),
      popoverForeground: v.string(),
      primary: v.string(),
      primaryForeground: v.string(),
      secondary: v.string(),
      secondaryForeground: v.string(),
      muted: v.string(),
      mutedForeground: v.string(),
      accent: v.string(),
      accentForeground: v.string(),
      destructive: v.string(),
      destructiveForeground: v.string(),
      border: v.string(),
      input: v.string(),
      ring: v.string(),
    })),
    dayTurnoverMinutes: v.optional(v.number()),
    routineSpawnMinutes: v.optional(v.number()),
    utcOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { userId, ...fields }) => {
    const authedUserId = await requireAuth(ctx);
    if (userId !== authedUserId) throw new Error("Unauthorized");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.theme !== undefined) patch.theme = fields.theme;
    if (fields.dayTurnoverMinutes !== undefined) patch.dayTurnoverMinutes = fields.dayTurnoverMinutes;
    if (fields.routineSpawnMinutes !== undefined) patch.routineSpawnMinutes = fields.routineSpawnMinutes;
    if (fields.utcOffsetMinutes !== undefined) patch.utcOffsetMinutes = fields.utcOffsetMinutes;

    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { userId, ...patch } as any);
  },
});
