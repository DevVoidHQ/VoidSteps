/**
 * The first-run starter path.
 *
 * A "Getting Started" path whose steps describe themselves, so a new user
 * learns what a path and a step are by looking at one. Additive only: it is
 * written into an empty profile and never touches existing data, unlike
 * seed-demo.ts, which wipes everything for screenshots.
 */
import { db } from "./db";
import { createPath } from "./mutations/paths";
import { createStep } from "./mutations/steps";

export const STARTER_PATH_TITLE = "Getting Started";

/**
 * Seed the starter path when the profile has no paths and no steps. Returns
 * whether it seeded. The count and the writes share one transaction, so two
 * calls racing (StrictMode runs effects twice) still produce one path.
 */
export async function seedStarterPath(): Promise<boolean> {
  return db.transaction("rw", [db.paths, db.steps], async () => {
    if ((await db.paths.count()) > 0 || (await db.steps.count()) > 0) return false;

    const path = await createPath({
      title: STARTER_PATH_TITLE,
      description: "A sample path. Edit or delete it any time.",
    });
    // Each new step lands on top of the list, so create them bottom first.
    await createStep({ title: "Check a step off when it's done", pathId: path._id });
    await createStep({ title: "Prioritize a step for today", pathId: path._id });
    await createStep({
      title: "Add your own first step",
      pathId: path._id,
      prioritizedToday: true,
    });
    return true;
  });
}
