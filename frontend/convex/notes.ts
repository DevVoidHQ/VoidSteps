import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { requireOwned } from "./lib/dbHelpers";

export const getNotes = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getNotesByNotebook = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook || notebook.userId !== userId) return [];
    return await ctx.db
      .query("notes")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .collect();
  },
});

export const getNote = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) return null;
    return note;
  },
});

export const createNote = mutation({
  args: {
    notebookId: v.id("notebooks"),
    title: v.string(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    await requireOwned(ctx, args.notebookId, userId, "Notebook not found");

    const now = Date.now();
    const id = await ctx.db.insert("notes", {
      userId,
      notebookId: args.notebookId,
      title: args.title,
      body: args.body ?? "",
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    notebookId: v.optional(v.id("notebooks")),
    sortOrder: v.optional(v.number()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Note not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.body !== undefined) patch.body = args.body;
    if (args.notebookId !== undefined) patch.notebookId = args.notebookId;
    if (args.sortOrder !== undefined) patch.sortOrder = args.sortOrder;
    if (args.archived !== undefined) {
      patch.archived = args.archived;
      patch.archivedAt = args.archived ? Date.now() : undefined;
    }

    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOwned(ctx, args.id, userId, "Note not found");
    await ctx.db.delete(args.id);
  },
});
