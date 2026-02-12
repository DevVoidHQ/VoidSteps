import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("routineSpawner", () => {
  it("spawns steps for due routines (nextOccurrence <= now)", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Due Routine",
        frequency: "daily",
        nextOccurrence: now - 1000, // due 1 second ago
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(
      internal.routineSpawner.spawnDueSteps,
      {}
    );
    expect(result.spawned).toBe(1);

    // Verify step was created
    await t.run(async (ctx) => {
      const steps = await ctx.db.query("steps").collect();
      expect(steps).toHaveLength(1);
      expect(steps[0].title).toBe("Due Routine");
      expect(steps[0].userId).toBe("user-123");
    });

  });

  it("does not spawn steps for not-yet-due routines", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Future Routine",
        frequency: "daily",
        nextOccurrence: now + 86400000, // 1 day from now
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(
      internal.routineSpawner.spawnDueSteps,
      {}
    );
    expect(result.spawned).toBe(0);

    await t.run(async (ctx) => {
      const steps = await ctx.db.query("steps").collect();
      expect(steps).toHaveLength(0);
    });

  });

  it("updates routine's nextOccurrence after spawning", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const oldNextOccurrence = now - 1000;

    let routineId: any;
    await t.run(async (ctx) => {
      routineId = await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Routine",
        frequency: "daily",
        nextOccurrence: oldNextOccurrence,
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.routineSpawner.spawnDueSteps, {});

    await t.run(async (ctx) => {
      const routine = await ctx.db.get(routineId);
      expect(routine!.nextOccurrence).toBeGreaterThan(oldNextOccurrence);
    });

  });

  it("spawned step inherits title, description, pathId, autoPrioritize from routine", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    let pathId: any;
    await t.run(async (ctx) => {
      pathId = await ctx.db.insert("paths", {
        userId: "user-123",
        title: "Test Path",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Routine Title",
        description: "Routine Desc",
        frequency: "daily",
        pathId,
        autoPrioritize: true,
        nextOccurrence: now - 1000,
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.mutation(internal.routineSpawner.spawnDueSteps, {});

    await t.run(async (ctx) => {
      const steps = await ctx.db.query("steps").collect();
      expect(steps).toHaveLength(1);
      const step = steps[0];
      expect(step.title).toBe("Routine Title");
      expect(step.description).toBe("Routine Desc");
      expect(step.pathId).toBe(pathId);
      expect(step.prioritizedToday).toBe(true);
    });

  });
});
