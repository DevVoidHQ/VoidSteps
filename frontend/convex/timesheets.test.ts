import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const testUser = { name: "Test User", subject: "user-123" };
const otherUser = { name: "Other", subject: "user-456" };

const page = (cursor: string | null = null) => ({ numItems: 100, cursor });

describe("timesheets: batch push", () => {
  it("creates a time entry resolving its step from the same batch", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const start = Date.now() - 60 * 60 * 1000;
    const end = start + 30 * 60 * 1000;
    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        // Entry listed BEFORE its step - CREATE_ORDER must sequence steps first.
        {
          tempId: "te1",
          type: "timeEntries",
          data: { stepId: "s1", stepTitle: "Deep work", start, end, durationMs: end - start, source: "timer", createdAt: start },
        },
        { tempId: "s1", type: "steps", data: { title: "Deep work" } },
      ],
      updates: [],
      deletes: [],
    });

    expect(res.created).toHaveLength(2);
    const stepId = res.created.find((c) => c.tempId === "s1")!.serverId;
    const entryId = res.created.find((c) => c.tempId === "te1")!.serverId;

    await t.run(async (ctx) => {
      const entry = await ctx.db.get(entryId as Id<"timeEntries">);
      expect(entry).not.toBeNull();
      expect(entry!.stepId).toBe(stepId);
      expect(entry!.durationMs).toBe(end - start);
      expect(entry!.source).toBe("timer");
      // Server stamps updatedAt (pull-cursor clock domain) but preserves the
      // client's createdAt.
      expect(entry!.createdAt).toBe(start);
    });
  });

  it("creates an activity event with old/new values", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const at = Date.now();
    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Task" } },
        {
          tempId: "ev1",
          type: "activityEvents",
          data: { stepId: "s1", type: "field_changed", field: "dueDate", oldValue: null, newValue: 123, at },
        },
      ],
      updates: [],
      deletes: [],
    });

    const evId = res.created.find((c) => c.tempId === "ev1")!.serverId;
    await t.run(async (ctx) => {
      const ev = await ctx.db.get(evId as Id<"activityEvents">);
      expect(ev).toMatchObject({ type: "field_changed", field: "dueDate", oldValue: null, newValue: 123, at });
    });
  });

  it("leaves an entry with an unresolvable step for retry (not acked, not rejected)", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        {
          tempId: "te1",
          type: "timeEntries",
          data: { stepId: "local_nope", stepTitle: "x", start: 1, end: 2, durationMs: 1, source: "timer" },
        },
      ],
      updates: [],
      deletes: [],
    });

    expect(res.created).toHaveLength(0);
    expect(res.rejected).toHaveLength(0);
  });

  it("applies edits and tombstones via updates, stamping server updatedAt", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const created = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Task" } },
        { tempId: "te1", type: "timeEntries", data: { stepId: "s1", stepTitle: "Task", start: 100, end: 200, durationMs: 100, source: "timer" } },
      ],
      updates: [],
      deletes: [],
    });
    const entryId = created.created.find((c) => c.tempId === "te1")!.serverId;

    const res = await asUser.mutation(api.batch.pushBatch, {
      creates: [],
      updates: [{ type: "timeEntries", id: entryId, data: { start: 50, end: 250, durationMs: 200, deleted: true } }],
      deletes: [],
    });
    expect(res.updatedIds).toEqual([entryId]);

    await t.run(async (ctx) => {
      const entry = await ctx.db.get(entryId as Id<"timeEntries">);
      expect(entry).toMatchObject({ start: 50, end: 250, durationMs: 200, deleted: true });
    });
  });

  it("refuses updates to another user's entry", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);
    const asOther = t.withIdentity(otherUser);

    const created = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Task" } },
        { tempId: "te1", type: "timeEntries", data: { stepId: "s1", stepTitle: "Task", start: 1, end: 2, durationMs: 1, source: "timer" } },
      ],
      updates: [],
      deletes: [],
    });
    const entryId = created.created.find((c) => c.tempId === "te1")!.serverId;

    const res = await asOther.mutation(api.batch.pushBatch, {
      creates: [],
      updates: [{ type: "timeEntries", id: entryId, data: { deleted: true } }],
      deletes: [],
    });
    expect(res.updatedIds).toHaveLength(0);
  });

  it("dedupes resent entry creates via idempotency", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const creates = [
      { tempId: "s1", type: "steps", data: { title: "Task" } },
      { tempId: "te1", type: "timeEntries", data: { stepId: "s1", stepTitle: "Task", start: 1, end: 2, durationMs: 1, source: "timer" } },
    ];
    const first = await asUser.mutation(api.batch.pushBatch, { creates, updates: [], deletes: [] });
    const second = await asUser.mutation(api.batch.pushBatch, { creates, updates: [], deletes: [] });

    expect(second.created.find((c) => c.tempId === "te1")!.serverId).toBe(
      first.created.find((c) => c.tempId === "te1")!.serverId
    );
    await t.run(async (ctx) => {
      const all = await ctx.db.query("timeEntries").collect();
      expect(all).toHaveLength(1);
    });
  });
});

describe("timesheets: listSince cursor pull", () => {
  it("requires auth", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.timeEntries.listSince, { since: 0, paginationOpts: page() })).rejects.toThrow(
      "Unauthenticated"
    );
  });

  it("returns only rows at/after the cursor, scoped to the caller", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const created = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Task" } },
        { tempId: "te1", type: "timeEntries", data: { stepId: "s1", stepTitle: "Task", start: 1, end: 2, durationMs: 1, source: "timer" } },
      ],
      updates: [],
      deletes: [],
    });
    const entryId = created.created.find((c) => c.tempId === "te1")!.serverId;

    // Another user's row must never appear.
    await t.withIdentity(otherUser).mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s2", type: "steps", data: { title: "Not mine" } },
        { tempId: "te2", type: "timeEntries", data: { stepId: "s2", stepTitle: "Not mine", start: 3, end: 4, durationMs: 1, source: "timer" } },
      ],
      updates: [],
      deletes: [],
    });

    const all = await asUser.query(api.timeEntries.listSince, { since: 0, paginationOpts: page() });
    expect(all.page).toHaveLength(1);
    expect(all.page[0]._id).toBe(entryId);
    expect(all.isDone).toBe(true);

    // gte semantics: a cursor equal to the row's updatedAt still returns it...
    const at = all.page[0].updatedAt;
    const atCursor = await asUser.query(api.timeEntries.listSince, { since: at, paginationOpts: page() });
    expect(atCursor.page).toHaveLength(1);
    // ...and anything past it returns nothing.
    const past = await asUser.query(api.timeEntries.listSince, { since: at + 1, paginationOpts: page() });
    expect(past.page).toHaveLength(0);
  });

  it("resurfaces a row after a tombstone update bumps updatedAt", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const created = await asUser.mutation(api.batch.pushBatch, {
      creates: [
        { tempId: "s1", type: "steps", data: { title: "Task" } },
        { tempId: "te1", type: "timeEntries", data: { stepId: "s1", stepTitle: "Task", start: 1, end: 2, durationMs: 1, source: "timer" } },
      ],
      updates: [],
      deletes: [],
    });
    const entryId = created.created.find((c) => c.tempId === "te1")!.serverId;

    const first = await asUser.query(api.timeEntries.listSince, { since: 0, paginationOpts: page() });
    const cursor = first.page[0].updatedAt + 1;

    // Ensure the tombstone's server updatedAt lands after the cursor (both
    // writes can otherwise share a millisecond in-process).
    await new Promise((r) => setTimeout(r, 5));

    await asUser.mutation(api.batch.pushBatch, {
      creates: [],
      updates: [{ type: "timeEntries", id: entryId, data: { deleted: true } }],
      deletes: [],
    });

    const after = await asUser.query(api.timeEntries.listSince, { since: cursor, paginationOpts: page() });
    expect(after.page).toHaveLength(1);
    expect(after.page[0].deleted).toBe(true);
  });

  it("paginates events in updatedAt order", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(testUser);

    const stepRes = await asUser.mutation(api.batch.pushBatch, {
      creates: [{ tempId: "s1", type: "steps", data: { title: "Task" } }],
      updates: [],
      deletes: [],
    });
    const stepId = stepRes.created[0].serverId;

    await asUser.mutation(api.batch.pushBatch, {
      creates: Array.from({ length: 5 }, (_, i) => ({
        tempId: `ev${i}`,
        type: "activityEvents",
        data: { stepId, type: "completed", at: 1000 + i },
      })),
      updates: [],
      deletes: [],
    });

    const p1 = await asUser.query(api.activityEvents.listSince, { since: 0, paginationOpts: { numItems: 2, cursor: null } });
    expect(p1.page).toHaveLength(2);
    expect(p1.isDone).toBe(false);

    const p2 = await asUser.query(api.activityEvents.listSince, { since: 0, paginationOpts: { numItems: 100, cursor: p1.continueCursor } });
    expect(p2.page).toHaveLength(3);
    expect(p2.isDone).toBe(true);

    const seen = new Set([...p1.page, ...p2.page].map((e) => e._id));
    expect(seen.size).toBe(5);
  });
});
