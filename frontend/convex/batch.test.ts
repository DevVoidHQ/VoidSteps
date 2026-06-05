import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const testUser = { name: "Test User", subject: "user-123" };

const empty = { creates: [], updates: [], deletes: [] };

describe("batch.pushBatch", () => {
  it("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.batch.pushBatch, empty)).rejects.toThrow("Unauthenticated");
  });

  it("creates across types in one call and resolves cross-type refs", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const res = await asUser.mutation(api.batch.pushBatch, {
      // Intentionally list the step BEFORE its path - server must reorder.
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Buy milk", pathId: "p1" } },
        { tempId: "p1", type: "paths", data: { title: "Errands" } },
      ],
      updates: [],
      deletes: [],
    });

    expect(res.created).toHaveLength(2);
    const pathServerId = res.created.find((c) => c.tempId === "p1")!.serverId;
    const stepServerId = res.created.find((c) => c.tempId === "s1")!.serverId;

    await t.run(async (ctx) => {
      const step = await ctx.db.get(stepServerId as Id<"steps">);
      expect(step).not.toBeNull();
      // The step's pathId points at the path's REAL server id, not "p1".
      expect(step!.pathId).toBe(pathServerId);
    });
  });


  it("preserves completion + tracked time on create (the analytics bug)", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);
    const completedAt = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago

    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        {
          tempId: "s1",
          type: "steps",
          data: { title: "Done thing", completed: true, completedAt, totalTimeSpentMs: 1_800_000, createdAt: completedAt },
        },
      ],
      updates: [],
      deletes: [],
    });

    const id = res.created[0].serverId;
    await t.run(async (ctx) => {
      const step = await ctx.db.get(id as Id<"steps">);
      expect(step!.completed).toBe(true);
      expect(step!.completedAt).toBe(completedAt);
      expect(step!.totalTimeSpentMs).toBe(1_800_000);
    });
  });

  it("links a note to a notebook created in the same batch", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "n1", type: "notes", data: { notebookId: "nb1", title: "First note", body: "hi" } },
        { tempId: "nb1", type: "notebooks", data: { title: "Journal" } },
      ],
      updates: [],
      deletes: [],
    });

    const nbId = res.created.find((c) => c.tempId === "nb1")!.serverId;
    const noteId = res.created.find((c) => c.tempId === "n1")!.serverId;
    await t.run(async (ctx) => {
      const note = await ctx.db.get(noteId as Id<"notes">);
      expect(note!.notebookId).toBe(nbId);
    });
  });

  it("applies updates and sets completedAt when marking complete", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const c = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "s1", type: "steps", data: { title: "Original" } }],
      updates: [],
      deletes: [],
    });
    const id = c.created[0].serverId;

    const u = await asUser.mutation(api.batch.pushBatch, {
      creates: [],
      updates: [{ type: "steps", id, data: { title: "Renamed", completed: true } }],
      deletes: [],
    });

    expect(u.updatedIds).toContain(id);
    await t.run(async (ctx) => {
      const step = await ctx.db.get(id as Id<"steps">);
      expect(step!.title).toBe("Renamed");
      expect(step!.completed).toBe(true);
      expect(typeof step!.completedAt).toBe("number");
    });
  });

  it("isolates a bad op so good ops in the same batch still commit", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    // Create a real step we can target, then send a batch with one good create
    // plus an update to a non-existent id.
    const seed = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "real", type: "steps", data: { title: "Real" } }],
      updates: [],
      deletes: [],
    });
    const realId = seed.created[0].serverId;

    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "good", type: "paths", data: { title: "Survivor" } }],
      updates: [
        { type: "steps", id: realId, data: { title: "Updated real" } },
        { type: "steps", id: "nonexistent_id", data: { title: "nope" } },
      ],
      deletes: [],
    });

    // Good create acknowledged; valid update acknowledged; bad update is not.
    expect(res.created.map((c) => c.tempId)).toContain("good");
    expect(res.updatedIds).toContain(realId);
    expect(res.updatedIds).not.toContain("nonexistent_id");
  });

  it("is idempotent: resending the same tempId reuses the row, no duplicate", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const first = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "s1", type: "steps", data: { title: "Buy milk" } }],
      updates: [],
      deletes: [],
    });
    const firstId = first.created[0].serverId;

    // Same tempId again (two tabs racing the shared queue / a lost ack retry).
    const second = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "s1", type: "steps", data: { title: "Buy milk" } }],
      updates: [],
      deletes: [],
    });

    // Returns the same server id rather than minting a new one.
    expect(second.created[0].serverId).toBe(firstId);

    await t.run(async (ctx) => {
      const steps = await ctx.db
        .query("steps")
        .withIndex("by_user", (q) => q.eq("userId", testUser.subject))
        .collect();
      expect(steps).toHaveLength(1);
    });
  });

  it("scopes idempotency per user: same tempId from another user creates its own row", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);
    const asOther = t.withIdentity({ name: "Other", subject: "user-999" });

    const a = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "shared", type: "steps", data: { title: "Mine" } }],
      updates: [], deletes: [],
    });
    const b = await asOther.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "shared", type: "steps", data: { title: "Theirs" } }],
      updates: [], deletes: [],
    });

    expect(b.created[0].serverId).not.toBe(a.created[0].serverId);
  });

  it("enforces per-user ownership on updates", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);
    const asOther = t.withIdentity({ name: "Other", subject: "user-999" });

    const c = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "s1", type: "steps", data: { title: "Mine" } }],
      updates: [],
      deletes: [],
    });
    const id = c.created[0].serverId;

    // A different user must not be able to update it.
    const res = await asOther.mutation(api.batch.pushBatch, {
      creates: [],
      updates: [{ type: "steps", id, data: { title: "Hacked" } }],
      deletes: [],
    });
    expect(res.updatedIds).not.toContain(id);

    await t.run(async (ctx) => {
      const step = await ctx.db.get(id as Id<"steps">);
      expect(step!.title).toBe("Mine");
    });
  });
});
