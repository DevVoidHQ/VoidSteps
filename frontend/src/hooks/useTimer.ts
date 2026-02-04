import { useState, useEffect } from 'react';

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
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Hook that returns a live-updating elapsed time string
 * Updates every second when startedAt is provided
 */
export function useElapsedTime(startedAt: number | undefined, baseTimeMs: number = 0): string {
  const [elapsed, setElapsed] = useState<number>(
    startedAt ? Date.now() - startedAt + baseTimeMs : baseTimeMs
  );

  useEffect(() => {
    if (!startedAt) {
      setElapsed(baseTimeMs);
      return;
    }

    // Initial calculation
    setElapsed(Date.now() - startedAt + baseTimeMs);

    // Update every second
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt + baseTimeMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, baseTimeMs]);

  return formatDuration(elapsed);
}
