import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getPaths = query({
  handler: async (ctx) => {
    return await ctx.db.query("paths").order("desc").collect();
  },
});

export const getPath = query({
  args: { id: v.id("paths") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutations
export const createPath = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const pathId = await ctx.db.insert("paths", {
      title: args.title,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(pathId);
  },
});

export const updatePath = mutation({
  args: {
    id: v.id("paths"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Path not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deletePath = mutation({
  args: { id: v.id("paths") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true, message: "Path deleted successfully" };
  },
});
