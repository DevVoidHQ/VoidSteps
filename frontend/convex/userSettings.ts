import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

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

// Update or create user settings
export const updateUserSettings = mutation({
  args: {
    userId: v.string(),
    theme: v.object({
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
    }),
  },
  handler: async (ctx, { userId, theme }) => {
    const authedUserId = await requireAuth(ctx);
    if (userId !== authedUserId) throw new Error("Unauthorized");

    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        theme,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new settings
      const id = await ctx.db.insert("userSettings", {
        userId,
        theme,
        updatedAt: Date.now(),
      });
      return id;
    }
  },
});
