import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { createPath } from "./mutations/paths";
import { createStep } from "./mutations/steps";
import { seedStarterPath, STARTER_PATH_TITLE } from "./starter-path";

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("seedStarterPath", () => {
  it("seeds one path holding three self-describing steps into an empty profile", async () => {
    expect(await seedStarterPath()).toBe(true);

    const paths = await db.paths.toArray();
    expect(paths).toHaveLength(1);
    expect(paths[0].title).toBe(STARTER_PATH_TITLE);

    const steps = (await db.steps.toArray()).sort((a, b) => a.sortOrder! - b.sortOrder!);
    expect(steps.map((s) => s.title)).toEqual([
      "Add your own first step",
      "Prioritize a step for today",
      "Check a step off when it's done",
    ]);
    expect(steps.every((s) => s.pathId === paths[0]._id)).toBe(true);
    expect(steps.map((s) => s.prioritizedToday)).toEqual([true, false, false]);
  });

  it("adds nothing when a path already exists", async () => {
    await createPath({ title: "Mine" });
    expect(await seedStarterPath()).toBe(false);
    expect(await db.paths.count()).toBe(1);
    expect(await db.steps.count()).toBe(0);
  });

  it("adds nothing when a step already exists", async () => {
    await createStep({ title: "Mine" });
    expect(await seedStarterPath()).toBe(false);
    expect(await db.paths.count()).toBe(0);
    expect(await db.steps.count()).toBe(1);
  });

  it("seeds once when two calls race", async () => {
    const results = await Promise.all([seedStarterPath(), seedStarterPath()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.paths.count()).toBe(1);
    expect(await db.steps.count()).toBe(3);
  });
});
