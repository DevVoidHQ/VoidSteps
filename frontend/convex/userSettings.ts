import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user settings
export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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
    userId: v.id("users"),
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
