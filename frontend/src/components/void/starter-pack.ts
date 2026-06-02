import { db } from "@/lib/db";

// Minimal "starter pack" Void offers when a user skips the tour: a single
// real (synced) sample path with a few steps so the app isn't an empty void.
// Unlike the admin demo seeder, this is additive: it never wipes existing data.

function lid(): string {
  return `local_${crypto.randomUUID()}`;
}

async function enqueueCreate(entityType: "paths" | "steps", entityId: string, data: Record<string, unknown>) {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation: "create",
    data,
    status: "pending",
    retryCount: 0,
    createdAt: Date.now(),
  });
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
    _localOnly: true,
  };
  await db.paths.add(path);
  await enqueueCreate("paths", pathId, path as unknown as Record<string, unknown>);

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
      _localOnly: true,
    };
    await db.steps.add(step);
    await enqueueCreate("steps", id, step as unknown as Record<string, unknown>);
  }
}
