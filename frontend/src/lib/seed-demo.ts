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
import type { LocalStep, LocalPath, LocalRoutine, LocalNotebook, LocalNote, LocalReminder } from "./db";
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
  entityType: "steps" | "paths" | "routines" | "notebooks" | "notes" | "reminders",
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
    { name: "reminders" as const, table: db.reminders },
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

async function addPath(p: {
  title: string;
  description?: string;
  parentId?: string;
  archived?: boolean;
}): Promise<string> {
  const id = lid();
  const now = Date.now();
  const path: LocalPath = {
    _id: id,
    title: p.title,
    description: p.description,
    parentId: p.parentId,
    archived: p.archived,
    archivedAt: p.archived ? now : undefined,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.paths.add(path);
  await enqueueCreate("paths", id, path as unknown as Record<string, unknown>);
  return id;
}

async function addReminder(r: {
  title: string;
  note?: string;
  recurrence: LocalReminder["recurrence"];
  date?: number;
  month?: number;
  day?: number;
}): Promise<string> {
  const id = lid();
  const now = Date.now();
  const reminder: LocalReminder = {
    _id: id,
    title: r.title,
    note: r.note,
    recurrence: r.recurrence,
    date: r.date,
    month: r.month,
    day: r.day,
    createdAt: now,
    updatedAt: now,
    _localOnly: !SEED_SYNC,
  };
  await db.reminders.add(reminder);
  await enqueueCreate("reminders", id, reminder as unknown as Record<string, unknown>);
  return id;
}

async function addStep(s: {
  title: string;
  description?: string;
  pathId?: string;
  routineId?: string;
  completed?: boolean;
  completedAt?: number;
  failed?: boolean;
  failedAt?: number;
  totalTimeSpentMs?: number;
  timerStartedAt?: number;
  prioritizedToday?: boolean;
  dueDate?: number;
  startDate?: number;
  archived?: boolean;
  archivedAt?: number;
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
    failed: s.failed ?? false,
    failedAt: s.failed ? s.failedAt ?? now : undefined,
    pathId: s.pathId,
    routineId: s.routineId,
    prioritizedToday: s.prioritizedToday ?? false,
    sortOrder: now,
    dueDate: s.dueDate,
    startDate: s.startDate,
    timerStartedAt: s.timerStartedAt,
    totalTimeSpentMs: s.totalTimeSpentMs,
    archived: s.archived,
    archivedAt: s.archived ? s.archivedAt ?? now : undefined,
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
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
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
    dayOfMonth: r.dayOfMonth,
    month: r.month,
    dayOfYear: r.dayOfYear,
    nextOccurrence: calculateNextOccurrence(r.frequency, r.daysOfWeek, r.dayOfMonth, r.month, r.dayOfYear),
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

async function addNote(n: { notebookId: string; title: string; body: string }): Promise<string> {
  const id = lid();
  const now = Date.now();
  const note: LocalNote = {
    _id: id,
    notebookId: n.notebookId,
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
  reminders: number;
  notebooks: number;
  notes: number;
}

/**
 * Populate the account with a polished demo dataset that exercises the full
 * model: nested paths, every routine frequency, all reminder recurrences, and
 * steps in every state (prioritized, due/overdue, deferred, running timer,
 * failed, archived, routine-spawned, and 30 days of completed history).
 *
 * @param opts.sync when true, seeded rows are pushed to the server via batch
 *   sync; otherwise they stay local-only (default - for fast screenshots).
 */
export async function seedDemoData(opts: { sync?: boolean } = {}): Promise<SeedResult> {
  SEED_SYNC = opts.sync ?? false;

  // Start from a clean slate so screenshots are consistent.
  await clearAllContent();

  const todayHour = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };

  let steps = 0;
  const step = async (...args: Parameters<typeof addStep>) => { const id = await addStep(...args); steps += 1; return id; };

  // --- Paths (with hierarchy) -------------------------------------------
  const reading = await addPath({ title: "Read 12 Books", description: "One book a month." });
  const spanish = await addPath({ title: "Learn Spanish", description: "Conversational fluency by year end." });
  const spanishGrammar = await addPath({ title: "Grammar", description: "Tenses & sentence structure.", parentId: spanish });
  const spanishVocab = await addPath({ title: "Vocabulary", description: "Daily word lists.", parentId: spanish });

  const ship = await addPath({ title: "Ship VoidSteps v1", description: "Public launch with pricing." });
  const shipFrontend = await addPath({ title: "Frontend", description: "UI, polish, PWA.", parentId: ship });
  const shipBackend = await addPath({ title: "Backend & Sync", description: "Convex, batch sync, auth.", parentId: ship });
  const shipLaunch = await addPath({ title: "Launch", description: "Pricing, demo, comms.", parentId: ship });

  const marathon = await addPath({ title: "Marathon Training", description: "Sub-4:00 in October." });

  const health = await addPath({ title: "Health", description: "Sustainable habits." });
  const fitness = await addPath({ title: "Fitness", parentId: health });
  await addPath({ title: "Nutrition", parentId: health });

  // An archived path (should be hidden from active views).
  await addPath({ title: "Old Side Project", description: "Shelved for now.", archived: true });
  const pathCount = 12;

  // --- Today's prioritized steps (for the Today page) --------------------
  await step({ title: "Write the launch announcement", pathId: shipLaunch, prioritizedToday: true, dueDate: todayHour(18) });
  await step({ title: "Finalize pricing page", pathId: shipLaunch, prioritizedToday: true, dueDate: todayHour(20) });
  await step({ title: "Spanish lesson: past tense", pathId: spanishGrammar, prioritizedToday: true });

  // --- A step with a running timer ---------------------------------------
  await step({ title: "Deep work: refactor sync engine", pathId: shipBackend, prioritizedToday: true, timerStartedAt: Date.now() - 22 * MIN, totalTimeSpentMs: 35 * MIN });

  // --- Active steps (mix of due dates) -----------------------------------
  await step({ title: "Wire Dodo checkout", pathId: shipBackend, dueDate: todayHour(22) + DAY });
  await step({ title: "Gate sync / notes / analytics by plan", pathId: shipBackend });
  await step({ title: "Record a 60s demo video", pathId: shipLaunch, dueDate: todayHour(12) + 2 * DAY });
  await step({ title: "Mobile responsive pass", pathId: shipFrontend });
  await step({ title: "Reach chapter 6 of 'Atomic Habits'", pathId: reading, dueDate: todayHour(20) + 3 * DAY });
  await step({ title: "Long run: 28km", pathId: marathon, dueDate: todayHour(8) + 2 * DAY });
  await step({ title: "Learn 20 new kitchen words", pathId: spanishVocab });

  // --- Overdue + failed + deferred + archived ----------------------------
  await step({ title: "Submit conference talk proposal", pathId: ship, dueDate: todayHour(17) - 2 * DAY }); // overdue
  await step({ title: "Skipped: 6am cold plunge", pathId: fitness, failed: true, failedAt: daysAgo(1, 6) });
  await step({ title: "Plan Q4 roadmap", pathId: ship, startDate: todayHour(9) + 5 * DAY }); // deferred (not yet active)
  await step({ title: "Archived: migrate off old DB", pathId: shipBackend, archived: true });

  // --- Routines (every frequency) + a couple spawned steps ---------------
  const morningReview = await addRoutine({ title: "Morning review", frequency: "daily", autoPrioritize: true, description: "Plan the day's top 3." });
  const flashcards = await addRoutine({ title: "Spanish flashcards", frequency: "daily", pathId: spanishVocab });
  await addRoutine({ title: "Strength workout", frequency: "weekdays", pathId: fitness });
  await addRoutine({ title: "Weekly planning", frequency: "weekly", daysOfWeek: [1], description: "Review paths and set the week." });
  await addRoutine({ title: "Pay rent", frequency: "monthly", dayOfMonth: 1 });
  await addRoutine({ title: "Annual health checkup", frequency: "yearly", month: 9, dayOfYear: 15 });
  const routineCount = 6;

  // Steps spawned by routines for today (carry routineId).
  await step({ title: "Morning review", pathId: undefined, routineId: morningReview, prioritizedToday: true });
  await step({ title: "Spanish flashcards", pathId: spanishVocab, routineId: flashcards });

  // --- Completed history spread over 30 days (rich analytics) ------------
  const historyTitles = [
    "Morning vocab drill", "Tempo run 8km", "Read 25 pages", "Grammar exercises",
    "Interval training", "Listening practice", "Refactor sync engine", "Strength session",
    "Watch a Spanish film", "Speaking practice", "Easy 6k run", "Review flashcards",
    "Draft blog post", "Mobility + stretching", "Finish a chapter", "Conjugation practice",
  ];
  const historyPaths = [spanish, spanishGrammar, marathon, reading, ship, fitness];
  for (let i = 0; i < 64; i++) {
    const day = Math.floor(Math.random() * 30);
    const completedAt = daysAgo(day, 9 + Math.floor(Math.random() * 10));
    await step({
      title: rand(historyTitles),
      pathId: rand(historyPaths),
      completed: true,
      completedAt,
      totalTimeSpentMs: (15 + Math.floor(Math.random() * 6) * 15) * MIN, // 15–90 min
      createdAt: completedAt - 2 * 60 * MIN,
    });
  }

  // --- Reminders (every recurrence) --------------------------------------
  await addReminder({ title: "Mom's birthday", recurrence: "yearly", month: 4, day: 12, note: "Order flowers a day early." });
  await addReminder({ title: "Pay credit card", recurrence: "monthly", day: 5 });
  await addReminder({ title: "Dentist appointment", recurrence: "once", date: todayHour(10) + 9 * DAY });
  const reminderCount = 3;

  // --- Notebooks + notes (markdown, some linked to paths) ----------------
  const journal = await addNotebook("Journal", "Daily reflections and ideas.");
  const product = await addNotebook("Product", "VoidSteps planning and notes.");
  const learning = await addNotebook("Learning", "Spanish & reading notes.");
  const notebookCount = 3;

  await addNote({
    notebookId: journal,
    title: "Why I'm building VoidSteps",
    body: "# Why VoidSteps\n\nMost trackers fall apart the moment you lose signal. I wanted something that is **offline-first**, calm, and actually mine.\n\n- Local first, sync second\n- No feeds, no noise\n- My data, exportable any time\n",
  });
  await addNote({
    notebookId: learning,
    title: "Spanish: phrases that keep tripping me up",
    body: "## Tricky phrases\n\n1. *por* vs *para*\n2. subjunctive after *espero que*\n3. reflexive verbs in the morning routine\n\n> Practice 10 minutes every morning. Consistency beats intensity.\n",
  });
  await addNote({
    notebookId: learning,
    title: "Books — 2026 list",
    body: "## Reading list\n\n- [x] Atomic Habits\n- [x] Deep Work\n- [ ] The Almanack of Naval\n- [ ] Shoe Dog\n",
  });
  await addNote({
    notebookId: product,
    title: "Launch checklist",
    body: "## Launch\n\n- [x] Redesign landing page\n- [x] Pricing strategy\n- [ ] Wire Dodo checkout\n- [ ] Demo video\n- [ ] Post to communities\n",
  });
  await addNote({
    notebookId: product,
    title: "Sync architecture",
    body: "## Sync\n\nLocal-first via Dexie. A queue batches mutations; the engine pushes every 5s and pulls every 60s. Soft-delete locally, hard-delete on the server.\n",
  });
  await addNote({
    notebookId: product,
    title: "Pricing notes",
    body: "## Pricing\n\n**Free** is a complete offline tracker with daily sync.\n\n**Pro** adds real-time sync, notes, and analytics.\n\nIndia: ₹499/mo. Global: $10/mo.\n",
  });
  const noteCount = 6;

  return {
    paths: pathCount,
    steps,
    routines: routineCount,
    reminders: reminderCount,
    notebooks: notebookCount,
    notes: noteCount,
  };
}
