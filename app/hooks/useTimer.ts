import { useClock } from "./useClock";

/**
 * Format milliseconds into a human-readable duration string
 * Returns "1:23:45" for hours:minutes:seconds or "5:30" for minutes:seconds
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Hook that returns a live-updating elapsed time string
 * Updates every second when startedAt is provided
 */
export function useElapsedTime(startedAt: number | undefined, baseTimeMs: number = 0): string {
  const now = useClock(startedAt ? 1000 : 60000);
  return formatDuration(baseTimeMs + (startedAt ? Math.max(0, now - startedAt) : 0));
}
