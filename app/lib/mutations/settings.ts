import { calculateNextOccurrence } from "../calculate-next-occurrence";
import { currentUtcOffsetMinutes } from "../day-settings";
import { db } from "../db";
import { generateLocalId } from "./helpers";

export const updateDaySettings = async (args: {
  dayTurnoverMinutes: number;
  routineSpawnMinutes: number;
}) => {
  const now = Date.now();
  const fields = {
    dayTurnoverMinutes: args.dayTurnoverMinutes,
    routineSpawnMinutes: args.routineSpawnMinutes,
    utcOffsetMinutes: currentUtcOffsetMinutes(),
    updatedAt: now,
  };

  await db.transaction("rw", [db.userSettings, db.routines], async () => {
    const existing = await db.userSettings.toCollection().first();
    if (existing) {
      await db.userSettings.update(existing._id, fields);
    } else {
      await db.userSettings.add({ _id: generateLocalId(), ...fields });
    }

    const opts = {
      spawnMinutes: args.routineSpawnMinutes,
      turnoverMinutes: args.dayTurnoverMinutes,
    };
    const routines = await db.routines.toArray();
    for (const routine of routines) {
      const nextOccurrence = calculateNextOccurrence(
        routine.frequency,
        routine.daysOfWeek,
        routine.dayOfMonth,
        routine.month,
        routine.dayOfYear,
        opts
      );
      await db.routines.update(routine._id, { nextOccurrence, updatedAt: now });
    }
  });
};
