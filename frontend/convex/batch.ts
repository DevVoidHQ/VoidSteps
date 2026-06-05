import { v } from "convex/values";
import { mutation } from "./_generated/server";

async function requireAuth(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function nextOccurrence(
  frequency: string,
  daysOfWeek?: number[],
  dayOfMonth?: number,
  month?: number,
  dayOfYear?: number,
): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  switch (frequency) {
    case "daily":
      return tomorrow.getTime();
    case "weekdays": {
      const next = new Date(tomorrow);
      while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
      return next.getTime();
    }
    case "weekly": {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        const next = new Date(tomorrow);
        next.setDate(next.getDate() + 7);
        return next.getTime();
      }
      const sorted = [...daysOfWeek].sort((a, b) => a - b);
      const currentDay = tomorrow.getDay();
      let nextDay = sorted.find((d) => d >= currentDay);
      const next = new Date(tomorrow);
      if (nextDay !== undefined && nextDay > currentDay) {
        next.setDate(next.getDate() + (nextDay - currentDay));
      } else {
        nextDay = sorted[0];
        next.setDate(next.getDate() + (7 - currentDay + nextDay));
      }
      return next.getTime();
    }
    case "monthly": {
      const day = dayOfMonth || now.getDate();
      const next = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
      if (next <= now) next.setMonth(next.getMonth() + 1);
      while (next.getDate() !== day) next.setDate(0);
      return next.getTime();
    }
    case "yearly": {
      const m = (month || 1) - 1;
      const d = dayOfYear || 1;
      const next = new Date(now.getFullYear(), m, d, 0, 0, 0, 0);
      if (next <= now) next.setFullYear(next.getFullYear() + 1);
      return next.getTime();
    }
    default:
      return tomorrow.getTime();
  }
}

// Dependency order: a type's references must already exist when it is created.
const CREATE_ORDER = ["paths", "notebooks", "routines", "steps", "notes"] as const;
// Types whose parentId points at the same table (need parent-before-child ordering).
const SELF_PARENT = new Set(["paths"]);

/**
 * One-shot batch push. Replaces N per-entity round trips with a single call.
 * - Creates run in dependency order; intra-batch refs resolve via `idMap`.
 * - Each op is wrapped in try/catch so one bad row doesn't roll back the rest;
 *   the client retries whatever isn't reported as succeeded.
 */
export const pushBatch = mutation({
  args: {
    creates: v.array(v.object({ tempId: v.string(), type: v.string(), data: v.any() })),
    updates: v.array(v.object({ type: v.string(), id: v.string(), data: v.any() })),
    deletes: v.array(v.object({ type: v.string(), id: v.string() })),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const db: any = ctx.db;

    const idMap = new Map<string, string>(); // tempId -> serverId
    const resolve = (id: any): any => {
      if (id === undefined || id === null) return id;
      const s = String(id);
      return idMap.get(s) ?? id;
    };
    const created: { tempId: string; serverId: string }[] = [];
    const updatedIds: string[] = [];
    const deletedIds: string[] = [];

    // Idempotency: has this client create id already produced a server row?
    // (two tabs sharing the queue, a batch retry, or a lost ack can resend it).
    const idempotentServerId = async (clientId: string): Promise<string | undefined> => {
      const row = await db
        .query("syncIdempotency")
        .withIndex("by_user_client", (q: any) => q.eq("userId", userId).eq("clientId", clientId))
        .first();
      return row?.serverId;
    };

    // ---- CREATES (dependency order, parent-before-child within a type) ----
    const createsByType = new Map<string, typeof args.creates>();
    for (const c of args.creates) {
      if (!createsByType.has(c.type)) createsByType.set(c.type, []);
      createsByType.get(c.type)!.push(c);
    }

    const insertOne = async (type: string, d: any): Promise<string> => {
      const now = Date.now();
      switch (type) {
        case "paths":
          return await db.insert("paths", {
            userId, title: d.title, description: d.description,
            parentId: resolve(d.parentId), createdAt: now, updatedAt: now,
          });
        case "notebooks":
          return await db.insert("notebooks", {
            userId, title: d.title, description: d.description,
            sortOrder: d.sortOrder ?? now, createdAt: now, updatedAt: now,
          });
        case "routines":
          return await db.insert("routines", {
            userId, title: d.title, description: d.description, pathId: resolve(d.pathId),
            frequency: d.frequency, daysOfWeek: d.daysOfWeek, dayOfMonth: d.dayOfMonth,
            month: d.month, dayOfYear: d.dayOfYear, autoPrioritize: d.autoPrioritize,
            nextOccurrence: nextOccurrence(d.frequency, d.daysOfWeek, d.dayOfMonth, d.month, d.dayOfYear),
            createdAt: now, updatedAt: now,
          });
        case "notes": {
          const notebookId = resolve(d.notebookId);
          if (!notebookId) throw new Error("Note missing notebookId");
          return await db.insert("notes", {
            userId, notebookId, title: d.title,
            body: d.body ?? "", sortOrder: d.sortOrder ?? now, createdAt: now, updatedAt: now,
          });
        }
        case "steps": {
          const routineId = resolve(d.routineId);
          // Routine spawn idempotency (mirror createStep)
          if (routineId) {
            const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
            const existing = await db
              .query("steps")
              .withIndex("by_routine", (q: any) => q.eq("routineId", routineId))
              .filter((q: any) => q.gte(q.field("createdAt"), startOfToday.getTime()))
              .first();
            if (existing && existing.userId === userId) return existing._id;
          }
          // sortOrder: lower than current active steps
          const siblings = await db.query("steps")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("completed"), false)).collect();
          const baseOrder = d.completed ? d.createdAt ?? now : now;
          const minSort = siblings.reduce(
            (m: number, s: any) => Math.min(m, s.sortOrder ?? s.createdAt), baseOrder,
          );
          const completed = !!d.completed;
          return await db.insert("steps", {
            userId, title: d.title, description: d.description,
            completed, completedAt: completed ? d.completedAt ?? now : undefined,
            failed: false, pathId: resolve(d.pathId), routineId,
            prioritizedToday: d.prioritizedToday || false, sortOrder: minSort - 1,
            dueDate: d.dueDate, startDate: d.startDate,
            totalTimeSpentMs: d.totalTimeSpentMs,
            createdAt: d.createdAt ?? now, updatedAt: now,
          });
        }
        default:
          throw new Error(`Unknown create type: ${type}`);
      }
    };

    for (const type of CREATE_ORDER) {
      const items = createsByType.get(type) ?? [];
      if (items.length === 0) continue;

      // Order parents before children for self-referential types.
      let ordered = items;
      if (SELF_PARENT.has(type)) {
        const inBatch = new Set(items.map((i) => i.tempId));
        const noParentFirst = items.filter((i) => {
          const p = i.data?.parentId;
          return !p || !inBatch.has(String(p));
        });
        const rest = items.filter((i) => {
          const p = i.data?.parentId;
          return p && inBatch.has(String(p));
        });
        ordered = [...noParentFirst, ...rest];
      }

      for (const item of ordered) {
        try {
          // Already created this tempId before → reuse it, don't insert again.
          const existingServerId = await idempotentServerId(item.tempId);
          if (existingServerId) {
            idMap.set(item.tempId, existingServerId);
            created.push({ tempId: item.tempId, serverId: existingServerId });
            continue;
          }
          const serverId = await insertOne(type, item.data);
          idMap.set(item.tempId, String(serverId));
          await db.insert("syncIdempotency", {
            userId, clientId: item.tempId, table: type, serverId: String(serverId), createdAt: Date.now(),
          });
          created.push({ tempId: item.tempId, serverId: String(serverId) });
        } catch {
          // leave for client retry
        }
      }
    }

    // ---- UPDATES ----
    for (const u of args.updates) {
      try {
        const id = resolve(u.id);
        const existing = await db.get(id as any);
        if (!existing || existing.userId !== userId) continue;
        const d = u.data ?? {};
        const now = Date.now();
        const patch: any = { updatedAt: now };

        if (u.type === "steps") {
          if (d.title !== undefined) patch.title = d.title;
          if (d.description !== undefined) patch.description = d.description;
          if ("pathId" in d) patch.pathId = d.pathId == null ? undefined : resolve(d.pathId);
          if (d.prioritizedToday !== undefined) patch.prioritizedToday = d.prioritizedToday;
          if ("dueDate" in d) patch.dueDate = d.dueDate ?? undefined;
          if ("startDate" in d) patch.startDate = d.startDate ?? undefined;
          if ("archived" in d) patch.archived = d.archived;
          if ("archivedAt" in d) patch.archivedAt = d.archivedAt ?? undefined;
          if ("completed" in d && d.completed !== undefined) {
            if (d.completed && !existing.completed) { patch.completedAt = now; patch.failed = false; patch.failedAt = undefined; }
            else if (!d.completed && existing.completed) { patch.completedAt = undefined; }
            patch.completed = d.completed;
          }
          if ("failed" in d && d.failed !== undefined) {
            const cur = existing.failed ?? false;
            if (d.failed && !cur) patch.failedAt = now;
            else if (!d.failed && cur) patch.failedAt = undefined;
            patch.failed = d.failed;
          }
          if ("totalTimeSpentMs" in d) patch.totalTimeSpentMs = d.totalTimeSpentMs || undefined;
        } else if (u.type === "paths") {
          if (d.title !== undefined) patch.title = d.title;
          if (d.description !== undefined) patch.description = d.description;
          if ("parentId" in d) patch.parentId = d.parentId == null ? undefined : resolve(d.parentId);
          if (d.archived !== undefined) patch.archived = d.archived;
          if ("archivedAt" in d) patch.archivedAt = d.archivedAt ?? undefined;
        } else if (u.type === "routines") {
          if (d.title !== undefined) patch.title = d.title;
          if (d.description !== undefined) patch.description = d.description;
          if ("pathId" in d) patch.pathId = d.pathId == null ? undefined : resolve(d.pathId);
          if (d.frequency !== undefined) patch.frequency = d.frequency;
          if ("daysOfWeek" in d) patch.daysOfWeek = d.daysOfWeek ?? undefined;
          if ("dayOfMonth" in d) patch.dayOfMonth = d.dayOfMonth ?? undefined;
          if ("month" in d) patch.month = d.month ?? undefined;
          if ("dayOfYear" in d) patch.dayOfYear = d.dayOfYear ?? undefined;
          if (d.autoPrioritize !== undefined) patch.autoPrioritize = d.autoPrioritize;
          if (d.frequency || "daysOfWeek" in d || "dayOfMonth" in d || "month" in d || "dayOfYear" in d) {
            patch.nextOccurrence = nextOccurrence(
              patch.frequency ?? existing.frequency,
              patch.daysOfWeek ?? existing.daysOfWeek,
              patch.dayOfMonth ?? existing.dayOfMonth,
              patch.month ?? existing.month,
              patch.dayOfYear ?? existing.dayOfYear,
            );
          }
        } else if (u.type === "notebooks") {
          if (d.title !== undefined) patch.title = d.title;
          if ("description" in d) patch.description = d.description ?? undefined;
          if (d.sortOrder !== undefined) patch.sortOrder = d.sortOrder;
          if (d.archived !== undefined) { patch.archived = d.archived; patch.archivedAt = d.archived ? now : undefined; }
        } else if (u.type === "notes") {
          if (d.title !== undefined) patch.title = d.title;
          if (d.body !== undefined) patch.body = d.body;
          if (d.notebookId !== undefined) patch.notebookId = resolve(d.notebookId);
          if (d.sortOrder !== undefined) patch.sortOrder = d.sortOrder;
          if (d.archived !== undefined) { patch.archived = d.archived; patch.archivedAt = d.archived ? now : undefined; }
        } else {
          continue;
        }

        await db.patch(id as any, patch);
        updatedIds.push(u.id);
      } catch {
        // leave for client retry
      }
    }

    // ---- DELETES (with cascades mirroring single mutations) ----
    for (const del of args.deletes) {
      try {
        const id = resolve(del.id);
        const existing = await db.get(id as any);
        if (!existing || existing.userId !== userId) { deletedIds.push(del.id); continue; }

        if (del.type === "paths") {
          const children = await db.query("paths")
            .withIndex("by_parent", (q: any) => q.eq("parentId", id)).collect();
          for (const c of children) await db.patch(c._id, { parentId: undefined, updatedAt: Date.now() });
        } else if (del.type === "notebooks") {
          const notes = await db.query("notes")
            .withIndex("by_notebook", (q: any) => q.eq("notebookId", id)).collect();
          for (const n of notes) await db.delete(n._id);
        }

        await db.delete(id as any);
        deletedIds.push(del.id);
      } catch {
        // leave for client retry
      }
    }

    return { created, updatedIds, deletedIds };
  },
});
