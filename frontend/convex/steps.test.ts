import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const testUser = { name: "Test User", subject: "user-123" };

describe("steps", () => {
  // Auth
  describe("auth", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(t.query(api.steps.getActiveSteps, {})).rejects.toThrow(
        "Unauthenticated"
      );

    });
  });

  // Queries
  describe("getActiveSteps", () => {
    it("filters out failed steps", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Active step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Failed step",
          completed: false,
          failed: true,
          failedAt: now,
          prioritizedToday: false,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getActiveSteps, {});
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active step");

    });

    it("filters out steps with future startDate", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();
      const futureDate = now + 7 * 24 * 60 * 60 * 1000; // 7 days ahead

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Current step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Future step",
          completed: false,
          failed: false,
          startDate: futureDate,
          prioritizedToday: false,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getActiveSteps, {});
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Current step");

    });

    it("sorts by sortOrder ascending", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step C",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 30,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step A",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 10,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step B",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 20,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getActiveSteps, {});
      expect(result.map((s) => s.title)).toEqual([
        "Step A",
        "Step B",
        "Step C",
      ]);

    });
  });

  describe("getUpcomingSteps", () => {
    it("only returns steps with future startDate", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();
      const futureDate = now + 7 * 24 * 60 * 60 * 1000;

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Current step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Upcoming step",
          completed: false,
          failed: false,
          startDate: futureDate,
          prioritizedToday: false,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getUpcomingSteps, {});
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Upcoming step");

    });
  });

  describe("getCompletedStepsToday", () => {
    it("only returns steps completed after start-of-day timestamp", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayTs = startOfToday.getTime();

      await t.run(async (ctx) => {
        // Completed today
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Done today",
          completed: true,
          completedAt: startOfTodayTs + 3600000, // 1 hour after start of day
          failed: false,
          prioritizedToday: false,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
        // Completed yesterday
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Done yesterday",
          completed: true,
          completedAt: startOfTodayTs - 3600000, // 1 hour before start of day
          failed: false,
          prioritizedToday: false,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        });
        // Not completed
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Not done",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 3,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getCompletedStepsToday, {
        startOfDayTimestamp: startOfTodayTs,
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Done today");

    });
  });

  describe("getFailedSteps", () => {
    it("only returns steps where failed === true", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Normal step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Failed step",
          completed: false,
          failed: true,
          failedAt: now,
          prioritizedToday: false,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.steps.getFailedSteps, {});
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Failed step");

    });
  });

  // Mutations
  describe("createStep", () => {
    it("inserts step and returns with path populated", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathId!: Id<"paths">;
      await t.run(async (ctx) => {
        pathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Test Path",
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.createStep, {
        title: "New Step",
        pathId,
      });

      expect(result.title).toBe("New Step");
      expect(result.completed).toBe(false);
      expect(result.path).not.toBeNull();
      expect(result.path?.title).toBe("Test Path");

    });

    it("gives new step sortOrder lower than existing siblings", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      await t.run(async (ctx) => {
        await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Existing",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 100,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.createStep, {
        title: "New Step",
      });

      expect(result.sortOrder).toBeDefined();
      expect(result.sortOrder!).toBeLessThan(100);

    });
  });

  describe("updateStep", () => {
    it("sets completedAt and clears failed when marking completed", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: true,
          failedAt: now,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.updateStep, {
        id: stepId,
        completed: true,
      });

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeDefined();
      expect(result.failed).toBe(false);
      expect(result.failedAt).toBeUndefined();

    });

    it("clears completedAt when uncompleting", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: true,
          completedAt: now,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.updateStep, {
        id: stepId,
        completed: false,
      });

      expect(result.completed).toBe(false);
      expect(result.completedAt).toBeUndefined();

    });

    it("sets failedAt when marking failed", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.updateStep, {
        id: stepId,
        failed: true,
      });

      expect(result.failed).toBe(true);
      expect(result.failedAt).toBeDefined();

    });

    it("clears failedAt when unfailing", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: true,
          failedAt: now,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.updateStep, {
        id: stepId,
        failed: false,
      });

      expect(result.failed).toBe(false);
      expect(result.failedAt).toBeUndefined();

    });

    it("clears pathId when set to null", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        const pathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path",
          createdAt: now,
          updatedAt: now,
        });
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: false,
          pathId,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.updateStep, {
        id: stepId,
        pathId: null,
      });

      expect(result.pathId).toBeUndefined();
      expect(result.path).toBeNull();

    });
  });

  describe("deleteStep", () => {
    it("deletes the step", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "To delete",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.steps.deleteStep, { id: stepId });

      await t.run(async (ctx) => {
        expect(await ctx.db.get(stepId)).toBeNull();
      });
    });
  });

  describe("toggleStepCompletion", () => {
    it("toggles completed and clears failed state", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: true,
          failedAt: now,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Toggle on
      const result = await asUser.mutation(api.steps.toggleStepCompletion, {
        id: stepId,
      });
      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeDefined();
      expect(result.failed).toBe(false);
      expect(result.failedAt).toBeUndefined();

      // Toggle off
      const result2 = await asUser.mutation(api.steps.toggleStepCompletion, {
        id: stepId,
      });
      expect(result2.completed).toBe(false);
      expect(result2.completedAt).toBeUndefined();

    });
  });

  describe("toggleStepFailed", () => {
    it("toggles failed and clears completed state", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: true,
          completedAt: now,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Toggle on
      const result = await asUser.mutation(api.steps.toggleStepFailed, {
        id: stepId,
      });
      expect(result.failed).toBe(true);
      expect(result.failedAt).toBeDefined();
      expect(result.completed).toBe(false);
      expect(result.completedAt).toBeUndefined();

      // Toggle off
      const result2 = await asUser.mutation(api.steps.toggleStepFailed, {
        id: stepId,
      });
      expect(result2.failed).toBe(false);
      expect(result2.failedAt).toBeUndefined();

    });
  });

  describe("timer", () => {
    it("startTimer sets timerStartedAt", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.startTimer, {
        id: stepId,
      });
      expect(result.timerStartedAt).toBeDefined();

    });

    it("stopTimer accumulates totalTimeSpentMs across sessions", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: false,
          prioritizedToday: false,
          sortOrder: 0,
          timerStartedAt: now - 5000, // started 5 seconds ago
          totalTimeSpentMs: 10000, // already 10 seconds tracked
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.steps.stopTimer, {
        id: stepId,
      });

      expect(result.timerStartedAt).toBeUndefined();
      // Should have accumulated ~5s more (at least more than 10s)
      expect(result.totalTimeSpentMs).toBeGreaterThanOrEqual(10000);

    });
  });
});
