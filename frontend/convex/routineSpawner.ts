import { internalMutation } from "./_generated/server";
import { calculateNextOccurrence, getLogicalDayStart, type DayBoundaryOpts } from "./lib/recurrence";

// Internal mutation to spawn steps from routines.
//
// Day math runs in each USER's frame: their stored UTC offset plus their
// configured day boundaries (start of day = when routines land, end of day =
// when the dedup window rolls over). Users without settings fall back to
// offset 0 / midnight - the server's historical behavior.
export const spawnDueSteps = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // One settings row per user; load them all once for this sweep.
    const allSettings = await ctx.db.query("userSettings").collect();
    const optsByUser = new Map<string, DayBoundaryOpts>();
    for (const s of allSettings) {
      optsByUser.set(s.userId, {
        utcOffsetMinutes: s.utcOffsetMinutes ?? 0,
        spawnMinutes: s.routineSpawnMinutes ?? 0,
        turnoverMinutes: s.dayTurnoverMinutes ?? 0,
      });
    }
    const defaultOpts: DayBoundaryOpts = { utcOffsetMinutes: 0, spawnMinutes: 0, turnoverMinutes: 0 };
    const optsFor = (userId?: string) => (userId ? (optsByUser.get(userId) ?? defaultOpts) : defaultOpts);

    // Get all routines that are due
    const allRoutines = await ctx.db.query("routines").collect();
    const dueRoutines = allRoutines.filter(routine => routine.nextOccurrence <= now);

    let spawned = 0;

    // Spawn a new step for each due routine
    for (const routine of dueRoutines) {
      const opts = optsFor(routine.userId);

      // Dedup: skip if a step for this routine already exists in the user's
      // CURRENT logical day (their turnover boundary, not server midnight).
      const dayStartMs = getLogicalDayStart(now, opts);
      const existingStep = await ctx.db
        .query("steps")
        .withIndex("by_routine", (q) => q.eq("routineId", routine._id))
        .filter((q) => q.gte(q.field("createdAt"), dayStartMs))
        .first();

      if (existingStep) {
        continue;
      }

      // Create the new step from routine blueprint, propagating userId
      await ctx.db.insert("steps", {
        userId: routine.userId,
        title: routine.title,
        description: routine.description,
        completed: false,
        failed: false,
        pathId: routine.pathId,
        routineId: routine._id,
        prioritizedToday: routine.autoPrioritize ?? false,
        sortOrder: now,
        dueDate: undefined,
        startDate: undefined,
        createdAt: now,
        updatedAt: now,
      });

      // Update the routine's nextOccurrence in the user's frame, preserving
      // their configured spawn time (historically this recomputed in UTC and
      // permanently dragged spawns to 00:00 UTC).
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear,
        opts
      );

      await ctx.db.patch(routine._id, {
        nextOccurrence,
        updatedAt: now,
      });

      spawned++;
    }

    return { spawned };
  },
});
