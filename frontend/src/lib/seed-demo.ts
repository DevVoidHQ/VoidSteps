/**
 * Demo-data seeder for screenshots / marketing.
 *
 * Wipes existing content, then writes a realistic, good-looking dataset into
 * local Dexie. By default rows are `_localOnly` and skip the sync queue (fast,
 * consistent screenshots; survives pulls). Pass `{ sync: true }` to instead
 * enqueue them for batch sync so the demo data also lands on the server.
 * Gate access with `isSeedAdmin`.
 */
import { db } from "./db";
import type { LocalStep, LocalPath, LocalRoutine, LocalNotebook, LocalNote } from "./db";
import { calculateNextOccurrence } from "./calculate-next-occurrence";

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

/** Who is allowed to see/run the seeder. Set VITE_SEED_ADMIN_EMAILS=a@x.com,b@y.com */
export function isSeedAdmin(email: string | null | undefined): boolean {
  if (import.meta.env.DEV) return true;
  const raw = (import.meta.env.VITE_SEED_ADMIN_EMAILS as string | undefined) ?? "";
  const allow = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

function lid(): string {
  return `local_${crypto.randomUUID()}`;
}

// When true, seeded rows are enqueued for batch sync to the server; when false
// they stay local-only (default - fast, consistent screenshots). Set per run.
let SEED_SYNC = false;

async function enqueueCreate(
  entityType: "steps" | "paths" | "routines" | "notebooks" | "notes",
  entityId: string,
  data: Record<string, unknown>,
) {
  if (!SEED_SYNC) return;
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

/**
 * Seeded rows are intentionally NOT pushed to the server. The sync engine's
 * create path doesn't carry completion/time state, so a server round-trip would
 * wipe the backdated history that makes Analytics look good. Instead we keep
 * everything `_localOnly: true` and skip the sync queue - pull explicitly
 * preserves local-only rows, and every page reads from local Dexie.
 *
 * Wipe all content so seeding starts from a clean slate. Clears the pending
 * sync queue, enqueues deletes for already-synced items so the server clears
 * too, then empties the local tables.
 */
async function clearAllContent(): Promise<void> {
  const tables = [
    { name: "steps" as const, table: db.steps },
    { name: "paths" as const, table: db.paths },
    { name: "routines" as const, table: db.routines },
    { name: "pathways" as const, table: db.pathways },
    { name: "notebooks" as const, table: db.notebooks },
    { name: "notes" as const, table: db.notes },
  ];

  // Drop any pending creates/updates so they don't get pushed after we wipe.
  await db.syncQueue.clear();

  for (const { name, table } of tables) {
    const items = await table.toArray();
    for (const item of items) {
      // Only synced items exist on the server; local-only ones just vanish.
      if (!item._localOnly) {
        await db.syncQueue.add({
          entityType: name,
          entityId: item._id,
          operation: "delete",
          status: "pending",
          retryCount: 0,
          createdAt: Date.now(),
        });
      }
    }
    await table.clear();
  }
}

/** Timestamp `n` days ago at a given hour. */
function daysAgo(n: number, hour = 10): number {
  const d = new Date();
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.getTime() - n * DAY;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function addPath(p: { title: string; description?: string }): Promise<string> {
  const id = lid();
  const now = Date.now();
  const path: LocalPath = {
    _id: id,
    title: p.title,
    description: p.description,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.paths.add(path);
  await enqueueCreate("paths", id, path as unknown as Record<string, unknown>);
  return id;
}

async function addStep(s: {
  title: string;
  description?: string;
  pathId?: string;
  completed?: boolean;
  completedAt?: number;
  totalTimeSpentMs?: number;
  prioritizedToday?: boolean;
  dueDate?: number;
  createdAt?: number;
}): Promise<string> {
  const id = lid();
  const now = s.createdAt ?? Date.now();
  const step: LocalStep = {
    _id: id,
    title: s.title,
    description: s.description,
    completed: s.completed ?? false,
    completedAt: s.completed ? s.completedAt ?? now : undefined,
    failed: false,
    pathId: s.pathId,
    prioritizedToday: s.prioritizedToday ?? false,
    sortOrder: now,
    dueDate: s.dueDate,
    totalTimeSpentMs: s.totalTimeSpentMs,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.steps.add(step);
  await enqueueCreate("steps", id, step as unknown as Record<string, unknown>);
  return id;
}

async function addRoutine(r: {
  title: string;
  description?: string;
  pathId?: string;
  frequency: LocalRoutine["frequency"];
  daysOfWeek?: number[];
  autoPrioritize?: boolean;
}): Promise<string> {
  const id = lid();
  const now = Date.now();
  const routine: LocalRoutine = {
    _id: id,
    title: r.title,
    description: r.description,
    pathId: r.pathId,
    frequency: r.frequency,
    daysOfWeek: r.daysOfWeek,
    nextOccurrence: calculateNextOccurrence(r.frequency, r.daysOfWeek),
    autoPrioritize: r.autoPrioritize,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.routines.add(routine);
  await enqueueCreate("routines", id, routine as unknown as Record<string, unknown>);
  return id;
}

async function addNotebook(title: string, description?: string): Promise<string> {
  const id = lid();
  const now = Date.now();
  const nb: LocalNotebook = {
    _id: id,
    title,
    description,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.notebooks.add(nb);
  await enqueueCreate("notebooks", id, nb as unknown as Record<string, unknown>);
  return id;
}

async function addNote(n: { notebookId: string; pathId?: string; title: string; body: string }): Promise<string> {
  const id = lid();
  const now = Date.now();
  const note: LocalNote = {
    _id: id,
    notebookId: n.notebookId,
    pathId: n.pathId,
    title: n.title,
    body: n.body,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.notes.add(note);
  await enqueueCreate("notes", id, note as unknown as Record<string, unknown>);
  return id;
}

export interface SeedResult {
  paths: number;
  steps: number;
  routines: number;
  notebooks: number;
  notes: number;
}

/**
 * Populate the account with a polished demo dataset.
 * @param opts.sync when true, seeded rows are pushed to the server via batch
 *   sync; otherwise they stay local-only (default - for fast screenshots).
 */
export async function seedDemoData(opts: { sync?: boolean } = {}): Promise<SeedResult> {
  SEED_SYNC = opts.sync ?? false;
  const result: SeedResult = { paths: 0, steps: 0, routines: 0, notebooks: 0, notes: 0 };

  // Start from a clean slate so screenshots are consistent.
  await clearAllContent();

  const todayHour = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };

  // --- Paths -------------------------------------------------------------
  const spanish = await addPath({ title: "Learn Spanish", description: "Conversational fluency by year end." });
  const ship = await addPath({ title: "Ship VoidSteps v1", description: "Public launch with pricing." });
  const marathon = await addPath({ title: "Marathon Training", description: "Sub-4:00 in October." });
  const reading = await addPath({ title: "Read 12 Books", description: "One book a month." });
  result.paths = 4;

  let steps = 0;

  // --- Today's prioritized steps (for the Today page) --------------------
  await addStep({ title: "Write the launch announcement", pathId: ship, prioritizedToday: true, dueDate: todayHour(18) });
  await addStep({ title: "Spanish lesson: past tense", pathId: spanish, prioritizedToday: true, dueDate: todayHour(20) });
  await addStep({ title: "Easy 5k recovery run", pathId: marathon, prioritizedToday: true });
  steps += 3;

  // --- Active steps ------------------------------------------------------
  await addStep({ title: "Finalize pricing page", pathId: ship, dueDate: todayHour(22) + DAY });
  await addStep({ title: "Wire Dodo checkout", pathId: ship });
  await addStep({ title: "Gate sync / notes / analytics by plan", pathId: ship });
  await addStep({ title: "Record a 60s demo video", pathId: ship });
  await addStep({ title: "Reach chapter 6 of 'Atomic Habits'", pathId: reading, dueDate: todayHour(20) + 3 * DAY });
  await addStep({ title: "Long run: 28km", pathId: marathon, dueDate: todayHour(8) + 2 * DAY });
  await addStep({ title: "Learn 20 new kitchen words", pathId: spanish });
  steps += 7;

  // --- Completed history spread over 30 days (rich analytics) ------------
  const historyTitles = [
    "Morning vocab drill", "Tempo run 8km", "Read 25 pages", "Grammar exercises",
    "Interval training", "Listening practice", "Refactor sync engine", "Strength session",
    "Watch a Spanish film", "Speaking practice", "Easy 6k run", "Review flashcards",
    "Draft blog post", "Mobility + stretching", "Finish a chapter", "Conjugation practice",
  ];
  const historyPaths = [spanish, marathon, reading, ship];
  for (let i = 0; i < 64; i++) {
    const day = Math.floor(Math.random() * 30);
    const completedAt = daysAgo(day, 9 + Math.floor(Math.random() * 10));
    await addStep({
      title: rand(historyTitles),
      pathId: rand(historyPaths),
      completed: true,
      completedAt,
      totalTimeSpentMs: (15 + Math.floor(Math.random() * 6) * 15) * MIN, // 15–90 min
      createdAt: completedAt - 2 * 60 * MIN,
    });
    steps += 1;
  }
  result.steps = steps;

  // --- Routines ----------------------------------------------------------
  await addRoutine({ title: "Morning review", frequency: "daily", autoPrioritize: true, description: "Plan the day's top 3." });
  await addRoutine({ title: "Spanish flashcards", frequency: "daily", pathId: spanish });
  await addRoutine({ title: "Weekly planning", frequency: "weekly", daysOfWeek: [1], description: "Review paths and set the week." });
  await addRoutine({ title: "Strength workout", frequency: "weekdays", pathId: marathon });
  result.routines = 4;

  // --- Notebooks + notes (markdown) --------------------------------------
  const journal = await addNotebook("Journal", "Daily reflections and ideas.");
  const product = await addNotebook("Product", "VoidSteps planning and notes.");
  result.notebooks = 2;

  await addNote({
    notebookId: journal,
    title: "Why I'm building VoidSteps",
    body: "# Why VoidSteps\n\nMost trackers fall apart the moment you lose signal. I wanted something that is **offline-first**, calm, and actually mine.\n\n- Local first, sync second\n- No feeds, no noise\n- My data, exportable any time\n",
  });
  await addNote({
    notebookId: journal,
    pathId: spanish,
    title: "Spanish: phrases that keep tripping me up",
    body: "## Tricky phrases\n\n1. *por* vs *para*\n2. subjunctive after *espero que*\n3. reflexive verbs in the morning routine\n\n> Practice 10 minutes every morning. Consistency beats intensity.\n",
  });
  await addNote({
    notebookId: product,
    pathId: ship,
    title: "Launch checklist",
    body: "## Launch\n\n- [x] Redesign landing page\n- [x] Pricing strategy\n- [ ] Wire Dodo checkout\n- [ ] Demo video\n- [ ] Post to communities\n",
  });
  await addNote({
    notebookId: product,
    title: "Pricing notes",
    body: "## Pricing\n\n**Free** is a complete offline tracker with daily sync.\n\n**Pro** adds real-time sync, notes, and analytics.\n\nIndia: ₹499/mo. Global: $10/mo.\n",
  });
  result.notes = 4;

  return result;
}
