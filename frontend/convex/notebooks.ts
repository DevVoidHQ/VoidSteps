import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { requireOwned } from "./lib/db-helpers";

export const getNotebooks = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("notebooks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getNotebook = query({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const notebook = await ctx.db.get(args.id);
    if (!notebook || notebook.userId !== userId) return null;
    return notebook;
  },
});

export const createNotebook = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const id = await ctx.db.insert("notebooks", {
      userId,
      title: args.title,
      description: args.description,
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    });

    const notebook = await ctx.db.get(id);
    return notebook;
  },
});

export const updateNotebook = mutation({
  args: {
    id: v.id("notebooks"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    sortOrder: v.optional(v.number()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Notebook not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) {
      patch.description = args.description === null ? undefined : args.description;
    }
    if (args.sortOrder !== undefined) patch.sortOrder = args.sortOrder;
    if (args.archived !== undefined) {
      patch.archived = args.archived;
      patch.archivedAt = args.archived ? Date.now() : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const deleteNotebook = mutation({
  args: { id: v.id("notebooks") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Notebook not found");

    // Cascade: delete all notes in this notebook
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.id))
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    await ctx.db.delete(args.id);
  },
});
