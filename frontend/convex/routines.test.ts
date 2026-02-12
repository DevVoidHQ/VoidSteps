import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const testUser = { name: "Test User", subject: "user-123" };

describe("routines", () => {
  // Auth
  describe("auth", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(t.query(api.routines.getRoutines, {})).rejects.toThrow(
        "Unauthenticated"
      );

    });
  });

  // Mutations
  describe("createRoutine", () => {
    it("sets nextOccurrence based on frequency", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);

      const routineId = await asUser.mutation(api.routines.createRoutine, {
        title: "Daily Routine",
        frequency: "daily",
      });

      expect(routineId).toBeDefined();

      // Verify routine was created with nextOccurrence
      await t.run(async (ctx) => {
        const routine = await ctx.db.get(routineId);
        expect(routine).not.toBeNull();
        expect(routine!.title).toBe("Daily Routine");
        expect(routine!.frequency).toBe("daily");
        expect(routine!.nextOccurrence).toBeGreaterThan(Date.now() - 1000);
      });

    });
  });

  describe("updateRoutine", () => {
    it("recalculates nextOccurrence when frequency changes", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let routineId: any;
      await t.run(async (ctx) => {
        routineId = await ctx.db.insert("routines", {
          userId: "user-123",
          title: "Routine",
          frequency: "daily",
          nextOccurrence: now + 86400000,
          createdAt: now,
          updatedAt: now,
        });
      });

      const originalNextOccurrence = now + 86400000;
      await asUser.mutation(api.routines.updateRoutine, {
        id: routineId,
        frequency: "weekly",
      });

      await t.run(async (ctx) => {
        const routine = await ctx.db.get(routineId);
        expect(routine!.frequency).toBe("weekly");
        // nextOccurrence should be recalculated and differ from original
        expect(routine!.nextOccurrence).not.toBe(originalNextOccurrence);
      });

    });

    it("does NOT recalculate nextOccurrence when only title changes", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();
      const fixedNextOccurrence = now + 86400000;

      let routineId: any;
      await t.run(async (ctx) => {
        routineId = await ctx.db.insert("routines", {
          userId: "user-123",
          title: "Original Title",
          frequency: "daily",
          nextOccurrence: fixedNextOccurrence,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.routines.updateRoutine, {
        id: routineId,
        title: "Updated Title",
      });

      await t.run(async (ctx) => {
        const routine = await ctx.db.get(routineId);
        expect(routine!.title).toBe("Updated Title");
        expect(routine!.nextOccurrence).toBe(fixedNextOccurrence);
      });

    });
  });

  describe("deleteRoutine", () => {
    it("removes routine", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let routineId: any;
      await t.run(async (ctx) => {
        routineId = await ctx.db.insert("routines", {
          userId: "user-123",
          title: "Routine",
          frequency: "daily",
          nextOccurrence: now + 86400000,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.routines.deleteRoutine, { id: routineId });

      await t.run(async (ctx) => {
        const routine = await ctx.db.get(routineId);
        expect(routine).toBeNull();
      });

    });
  });

  // Queries
  describe("getRoutines", () => {
    it("returns routines enriched with path info", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      await t.run(async (ctx) => {
        const pathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Test Path",
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("routines", {
          userId: "user-123",
          title: "Routine with path",
          frequency: "daily",
          pathId,
          nextOccurrence: now + 86400000,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("routines", {
          userId: "user-123",
          title: "Routine without path",
          frequency: "weekly",
          nextOccurrence: now + 604800000,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.routines.getRoutines, {});
      expect(result).toHaveLength(2);

      const withPath = result.find((r) => r.title === "Routine with path");
      const withoutPath = result.find(
        (r) => r.title === "Routine without path"
      );

      expect(withPath!.path).not.toBeNull();
      expect(withPath!.path!.title).toBe("Test Path");
      expect(withoutPath!.path).toBeNull();

    });
  });
});
