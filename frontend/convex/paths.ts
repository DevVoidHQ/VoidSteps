import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

async function requireAuth(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// Queries
export const getPaths = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.query("paths")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc").collect();
  },
});

export const getPath = query({
  args: { id: v.id("paths") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const path = await ctx.db.get(args.id);
    if (!path || path.userId !== userId) return null;
    return path;
  },
});

// Get root paths (paths with no parent)
export const getRootPaths = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const allPaths = await ctx.db.query("paths")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return allPaths.filter((path) => !path.parentId);
  },
});

// Get child paths of a specific parent
export const getChildPaths = query({
  args: { parentId: v.id("paths") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const children = await ctx.db
      .query("paths")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
    return children.filter(c => c.userId === userId);
  },
});

// Mutations
export const createPath = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("paths")),
    connectedPathIds: v.optional(v.array(v.id("paths"))),
    connectedStepIds: v.optional(v.array(v.id("steps"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    const pathId = await ctx.db.insert("paths", {
      userId,
      title: args.title,
      description: args.description,
      parentId: args.parentId,
      connectedPathIds: args.connectedPathIds,
      connectedStepIds: args.connectedStepIds,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(pathId);
  },
});

// Helper to check for circular references
async function hasCircularReference(
  ctx: any,
  pathId: string,
  newParentId: string
): Promise<boolean> {
  // Check if the newParentId eventually leads back to pathId
  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === pathId) return true;
    if (visited.has(currentId)) return false; // Cycle found but doesn't include pathId
    visited.add(currentId);

    const currentPath: { parentId?: { toString(): string } } | null = await ctx.db.get(currentId as any);
    currentId = currentPath?.parentId?.toString() || null;
  }

  return false;
}

export const updatePath = mutation({
  args: {
    id: v.id("paths"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    parentId: v.optional(v.union(v.id("paths"), v.null())),
    connectedPathIds: v.optional(v.array(v.id("paths"))),
    connectedStepIds: v.optional(v.array(v.id("steps"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, parentId, ...otherUpdates } = args;

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Path not found");

    // Check for circular reference if parentId is being updated
    if (parentId !== undefined && parentId !== null) {
      const wouldCreateCycle = await hasCircularReference(ctx, id, parentId);
      if (wouldCreateCycle) {
        throw new Error("Cannot set parent: would create circular reference");
      }
    }

    const updates: any = { ...otherUpdates, updatedAt: Date.now() };
    if (parentId !== undefined) {
      updates.parentId = parentId;
    }

    await ctx.db.patch(id, updates);

    return await ctx.db.get(id);
  },
});

export const deletePath = mutation({
  args: { id: v.id("paths") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const path = await ctx.db.get(args.id);
    if (!path || path.userId !== userId) throw new Error("Not found");

    // Orphan children (set their parentId to null)
    const children = await ctx.db
      .query("paths")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const child of children) {
      await ctx.db.patch(child._id, { parentId: undefined, updatedAt: Date.now() });
    }

    await ctx.db.delete(args.id);
    return { success: true, message: "Path deleted successfully" };
  },
});
