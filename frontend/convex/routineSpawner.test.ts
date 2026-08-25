import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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

    let routineId!: Id<"routines">;
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

  it("deduplicates: calling spawnDueSteps twice only creates one step", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Daily Routine",
        frequency: "daily",
        nextOccurrence: now - 1000, // due
        createdAt: now,
        updatedAt: now,
      });
    });

    // First call should spawn 1 step
    const result1 = await t.mutation(
      internal.routineSpawner.spawnDueSteps,
      {}
    );
    expect(result1.spawned).toBe(1);

    // Reset nextOccurrence so the routine looks due again
    await t.run(async (ctx) => {
      const routines = await ctx.db.query("routines").collect();
      await ctx.db.patch(routines[0]._id, {
        nextOccurrence: now - 500,
      });
    });

    // Second call should skip due to dedup
    const result2 = await t.mutation(
      internal.routineSpawner.spawnDueSteps,
      {}
    );
    expect(result2.spawned).toBe(0);

    // Verify only 1 step total
    await t.run(async (ctx) => {
      const steps = await ctx.db.query("steps").collect();
      expect(steps).toHaveLength(1);
    });

  });

  it("spawned step inherits title, description, pathId, autoPrioritize from routine", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    let pathId!: Id<"paths">;
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

describe("routineSpawner day-boundary settings", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("recomputes nextOccurrence at the user's configured spawn time and offset", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const OFFSET = 330; // IST
    const SPAWN = 360; // 6:00

    await t.run(async (ctx) => {
      await ctx.db.insert("userSettings", {
        userId: "user-123",
        routineSpawnMinutes: SPAWN,
        dayTurnoverMinutes: 0,
        utcOffsetMinutes: OFFSET,
        updatedAt: now,
      });
      await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Morning routine",
        frequency: "daily",
        nextOccurrence: now - 1000,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(internal.routineSpawner.spawnDueSteps, {});
    expect(result.spawned).toBe(1);

    await t.run(async (ctx) => {
      const routine = (await ctx.db.query("routines").collect())[0];
      // The recomputed occurrence must land at 6:00 in the user's frame:
      // (occurrence + offset) modulo 24h == spawn minutes.
      const inUserFrame = routine.nextOccurrence + OFFSET * 60_000;
      expect(((inUserFrame % DAY) + DAY) % DAY).toBe(SPAWN * 60_000);
      expect(routine.nextOccurrence).toBeGreaterThan(now);
    });
  });

  it("dedups within the user's logical day, not server midnight", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    // Give the user a turnover far enough back that a step created 1h ago is
    // inside the current logical day regardless of when the test runs.
    await t.run(async (ctx) => {
      await ctx.db.insert("userSettings", {
        userId: "user-123",
        routineSpawnMinutes: 0,
        dayTurnoverMinutes: 0,
        utcOffsetMinutes: 0,
        updatedAt: now,
      });
      const routineId = await ctx.db.insert("routines", {
        userId: "user-123",
        title: "Daily",
        frequency: "daily",
        nextOccurrence: now - 1000,
        createdAt: now,
        updatedAt: now,
      });
      // A step spawned earlier in the current UTC day
      await ctx.db.insert("steps", {
        userId: "user-123",
        title: "Daily",
        completed: false,
        prioritizedToday: false,
        routineId,
        createdAt: now - 1,
        updatedAt: now - 1,
      });
    });

    const result = await t.mutation(internal.routineSpawner.spawnDueSteps, {});
    expect(result.spawned).toBe(0);
  });

  it("falls back to server-midnight behavior for users without settings", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("routines", {
        userId: "user-456",
        title: "No settings",
        frequency: "daily",
        nextOccurrence: now - 1000,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(internal.routineSpawner.spawnDueSteps, {});
    expect(result.spawned).toBe(1);

    await t.run(async (ctx) => {
      const routine = (await ctx.db.query("routines").collect())[0];
      // Old behavior preserved: next occurrence at UTC midnight (offset 0).
      expect(routine.nextOccurrence % DAY).toBe(0);
    });
  });
});
