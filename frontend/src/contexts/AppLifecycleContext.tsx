import React, { useEffect } from 'react';
import { db } from '@/lib/db';
import { startRoutineSpawner } from '@/lib/routine-spawner';
import { reportError } from '@/lib/error-store';
import { currentUtcOffsetMinutes } from '@/lib/day-settings';
import { ACTIVITY_RETENTION_DAYS } from '@/lib/retention';
import { useZoomShortcuts } from '@/hooks/useZoomShortcuts';

/**
 * Background housekeeping that runs for as long as the app is open: routine
 * spawning, activity-log pruning, and keeping the stored UTC offset current.
 * Holds no state, so there is nothing to consume - mount it and forget it.
 */
export const AppLifecycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useZoomShortcuts();

  // Keep the stored UTC offset current (DST transitions, travel) so routines
  // keep spawning in the user's actual local frame. Only when a settings row
  // already exists - defaults need no row.
  useEffect(() => {
    (async () => {
      try {
        const row = await db.userSettings.toCollection().first();
        if (!row) return;
        const offset = currentUtcOffsetMinutes();
        if (row.utcOffsetMinutes === offset) return;
        await db.userSettings.update(row._id, { utcOffsetMinutes: offset, updatedAt: Date.now() });
      } catch (e) {
        reportError('mutation', e, { phase: 'utcOffsetRefresh' });
      }
    })();
  }, []);

  // Trim the local activity log so the append-only audit table can't grow
  // unbounded on-device. Time entries (the actual timesheet data) are never
  // pruned.
  useEffect(() => {
    const timer = setTimeout(() => {
      const cutoff = Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      db.activityEvents
        .where('at')
        .below(cutoff)
        .delete()
        .catch((e) => reportError('mutation', e, { phase: 'activityPrune' }));
    }, 12_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => startRoutineSpawner(), []);

  return <>{children}</>;
};
