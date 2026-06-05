import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { requireSuperAdmin } from "./lib/admin";

// Submit feedback from the in-app Settings form. Any signed-in user. The client
// attaches sanitized diagnostics on bug reports (version / online / sync-queue
// counts) - never task content.
export const submitFeedback = mutation({
  args: {
    type: v.union(v.literal("general"), v.literal("bug"), v.literal("feature")),
    message: v.string(),
    email: v.optional(v.string()),
    diagnostics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const message = args.message.trim();
    if (!message) throw new Error("Message is required");

    await ctx.db.insert("feedback", {
      userId,
      email: args.email,
      type: args.type,
      message: message.slice(0, 5000),
      diagnostics: args.diagnostics,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

// --- Superadmin review ---

export const listFeedback = query({
  args: { status: v.optional(v.union(v.literal("open"), v.literal("resolved"))) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("feedback").order("desc").collect();
  },
});

export const setFeedbackStatus = mutation({
  args: {
    id: v.id("feedback"),
    status: v.union(v.literal("open"), v.literal("resolved")),
    // Admin reply, shown back to the user in their feedback history. Pass a
    // non-empty string to set it, an empty string to clear it, or omit to leave
    // it unchanged.
    reply: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.reply !== undefined) {
      const reply = args.reply.trim();
      // undefined unsets the optional field in Convex; "" → cleared reply.
      patch.adminReply = reply || undefined;
      patch.repliedAt = reply ? Date.now() : undefined;
    }
    await ctx.db.patch(args.id, patch);
  },
});

// Admin: full feedback thread for one user (all statuses, newest first).
export const userFeedback = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// User-facing: the signed-in user's own feedback history + any admin replies.
export const myFeedback = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
