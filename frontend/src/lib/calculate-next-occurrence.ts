// Routine scheduling math lives in recurrence.ts. Re-exported here to keep the
// existing import path stable.
export { calculateNextOccurrence, getLogicalDayStart } from "./recurrence";
export type { DayBoundaryOpts } from "./recurrence";
