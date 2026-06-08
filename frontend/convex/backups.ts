import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Free-tier safety backup. Free is local-only, so this single per-user snapshot
// is the only thing that survives a browser-data-clear / new device. Auth-only
// (NOT sync-gated): keeping free users' data recoverable is the whole point.
// It is a point-in-time blob, not live sync - Pro is what gets real-time cross-
// device sync.

// Convex documents cap at ~1MB. Free datasets (no Notes) are tiny, but guard
// anyway so an oversized snapshot fails loudly client-side instead of silently.
const MAX_BACKUP_BYTES = 900_000;

export const saveBackup = mutation({
  args: {
    data: v.string(),
    counts: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const size = args.data.length;
    if (size > MAX_BACKUP_BYTES) {
      throw new Error("BACKUP_TOO_LARGE");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("backups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data, counts: args.counts, size, updatedAt: now });
    } else {
      await ctx.db.insert("backups", { userId, data: args.data, counts: args.counts, size, updatedAt: now });
    }
    return { size, updatedAt: now };
  },
});

// Lightweight status for the Settings UI - never ships the blob itself.
export const backupStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("backups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return null;
    return { counts: existing.counts ?? null, size: existing.size, updatedAt: existing.updatedAt };
  },
});

// Full snapshot for restore (new device / post-clear). Returns null if none.
export const getBackup = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("backups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return null;
    return { data: existing.data, counts: existing.counts ?? null, updatedAt: existing.updatedAt };
  },
});
