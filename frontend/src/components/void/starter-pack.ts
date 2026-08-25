import { db } from "@/lib/db";

// Minimal "starter pack" Void offers when a user skips the tour: a single
// sample path with a few steps so the app isn't an empty void. Unlike the admin
// demo seeder, this is additive: it never wipes existing data.

function lid(): string {
  return `local_${crypto.randomUUID()}`;
}
export async function seedStarterPack(): Promise<void> {
  const now = Date.now();
  const pathId = lid();
  const path = {
    _id: pathId,
    title: "Getting Started",
    description: "A sample goal from Void. Edit or delete it any time.",
    createdAt: now,
    updatedAt: now,
  };
  await db.paths.add(path);

  const samples = [
    { title: "Add your own first step", prioritizedToday: true },
    { title: "Star a step to focus on it today", prioritizedToday: false },
    { title: "Check a step off when it's done", prioritizedToday: false },
  ];

  let order = now;
  for (const s of samples) {
    const id = lid();
    const step = {
      _id: id,
      title: s.title,
      completed: false,
      failed: false,
      pathId,
      prioritizedToday: s.prioritizedToday,
      sortOrder: order--,
      createdAt: now,
      updatedAt: now,
    };
    await db.steps.add(step);
  }
}
