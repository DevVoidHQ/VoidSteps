import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour to spawn steps from recurring routines
crons.hourly(
  "spawn-recurring-steps",
  { minuteUTC: 0 }, // Run at the top of every hour
  internal.routineSpawner.spawnDueSteps
);

export default crons;
