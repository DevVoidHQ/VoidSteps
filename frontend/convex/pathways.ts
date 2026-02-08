import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

async function requireAuth(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// Queries
export const getPathways = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.query("pathways")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc").collect();
  },
});

export const getPathway = query({
  args: { id: v.id("pathways") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const pathway = await ctx.db.get(args.id);
    if (!pathway || pathway.userId !== userId) return null;
    return pathway;
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
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const pathwayId = await ctx.db.insert("pathways", {
      userId,
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
    const userId = await requireAuth(ctx);
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Pathway not found");

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
    const userId = await requireAuth(ctx);
    const pathway = await ctx.db.get(args.id);
    if (!pathway || pathway.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return { success: true, message: "Pathway deleted successfully" };
  },
});
