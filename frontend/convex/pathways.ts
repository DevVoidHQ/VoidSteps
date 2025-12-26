import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getPathways = query({
  handler: async (ctx) => {
    return await ctx.db.query("pathways").order("desc").collect();
  },
});

export const getPathway = query({
  args: { id: v.id("pathways") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutations
export const createPathway = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("pathways")),
    pathIds: v.optional(v.array(v.id("paths"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const pathwayId = await ctx.db.insert("pathways", {
      title: args.title,
      description: args.description,
      parentId: args.parentId,
      pathIds: args.pathIds,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(pathwayId);
  },
});

export const updatePathway = mutation({
  args: {
    id: v.id("pathways"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("pathways")),
    pathIds: v.optional(v.array(v.id("paths"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Pathway not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deletePathway = mutation({
  args: { id: v.id("pathways") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true, message: "Pathway deleted successfully" };
  },
});
