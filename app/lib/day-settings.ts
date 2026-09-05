// Day-boundary settings: the user-configurable "start of day" (when routines
// spawn) and "end of day" (when 'today' rolls over for task semantics). Stored
// on the userSettings row and read from Dexie here.

import { db } from "./db";
import type { DayBoundaryOpts } from "./calculate-next-occurrence";

export interface DaySettings {
  /** "End of day": minutes past midnight when the logical day rolls over. */
  dayTurnoverMinutes: number;
  /** "Start of day": minutes past midnight when routines spawn. */
  routineSpawnMinutes: number;
}

const DEFAULT_DAY_SETTINGS: DaySettings = {
  dayTurnoverMinutes: 0,
  routineSpawnMinutes: 0,
};

/** The device's current UTC offset in minutes, east-positive (IST = 330). */
export function currentUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** Read the day settings from the local userSettings row (defaults when unset). */
export async function getDaySettings(): Promise<DaySettings> {
  const row = await db.userSettings.toCollection().first();
  return {
    dayTurnoverMinutes: row?.dayTurnoverMinutes ?? DEFAULT_DAY_SETTINGS.dayTurnoverMinutes,
    routineSpawnMinutes: row?.routineSpawnMinutes ?? DEFAULT_DAY_SETTINGS.routineSpawnMinutes,
  };
}

/** Recurrence/day-math options for these settings on THIS device (the device's
 * own offset - the stored utcOffsetMinutes is for the server cron). */
export function toDayBoundaryOpts(settings: DaySettings): DayBoundaryOpts {
  return {
    spawnMinutes: settings.routineSpawnMinutes,
    turnoverMinutes: settings.dayTurnoverMinutes,
  };
}

/** "3:30 AM"-style label for a minutes-past-midnight value (Settings UI). */
export function formatMinutesAsTime(minutes: number): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
