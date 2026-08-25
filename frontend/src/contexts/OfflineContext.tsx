import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { convexClient } from '@/lib/convex-client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync-engine';
import { performInitialSync } from '@/lib/initial-sync';
import { startRoutineSpawner } from '@/lib/routine-spawner';
import { useOnlineStatus } from '@/lib/online-status';
import { reportError } from '@/lib/error-store';
import { useCan } from '@/lib/use-plan';
import { setSyncEnabled, isSyncEnabled } from '@/lib/sync-enabled';
import { maybeBackup } from '@/lib/backup-engine';
import { currentUtcOffsetMinutes } from '@/lib/day-settings';
import { ACTIVITY_RETENTION_DAYS_FREE, ACTIVITY_RETENTION_DAYS_PRO } from '../../convex/lib/entitlements';
import LoadingScreen from '@/components/LoadingScreen';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  lastSyncTime: number | null;
  isInitialSyncing: boolean;
  initialSyncFailed: boolean;
  /** Force an immediate push + pull. Resolves when both complete. */
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

async function clearLocalData() {
  // Wipe ALL user-content tables on a user switch so the next account never
  // inherits the previous one's data (privacy) and a fresh-client restore sees
  // a truly empty local store. errorLog is diagnostic, not content, so left as-is.
  await db.transaction(
    'rw',
    [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.userSettings, db.timeEntries, db.activityEvents, db.syncQueue, db.syncMeta],
    async () => {
      await db.steps.clear();
      await db.paths.clear();
      await db.routines.clear();
      await db.reminders.clear();
      await db.notebooks.clear();
      await db.notes.clear();
      await db.userSettings.clear();
      await db.timeEntries.clear();
      await db.activityEvents.clear();
      await db.syncQueue.clear();
      await db.syncMeta.clear();
    }
  );
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isOnline = useOnlineStatus();
  // Free is fully local-only. Only Pro/Lifetime may sync at all. Mirror into the
  // module flag the enqueue() helpers read (set in render so writes never race
  // ahead of an effect; defaults false = local-safe until the plan resolves).
  const canSync = useCan('sync');
  setSyncEnabled(canSync);
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);
  const [initialSyncFailed, setInitialSyncFailed] = useState(false);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const routineCleanupRef = useRef<(() => void) | null>(null);

  const userId = user?.id;

  // Reactive pending sync count
  const pendingSyncCount = useLiveQuery(
    () => db.syncQueue.where('status').anyOf('pending', 'in-progress').count(),
    [],
    0
  );

  // Reactive failed sync count
  const failedSyncCount = useLiveQuery(
    () => db.syncQueue.where('status').equals('failed').count(),
    [],
    0
  );

  // Reactive last sync time
  const lastSyncMeta = useLiveQuery(
    () => db.syncMeta.get('lastPullTimestamp'),
    []
  );
  const lastSyncTime = (lastSyncMeta?.value as number) ?? null;

  // Initialize on mount - wait for Convex auth, check if user changed
  useEffect(() => {
    if (!userId || !isSignedIn) return;
    let mounted = true;

    async function init() {
      try {
        // Check if the local cache belongs to a different user
        const cachedUser = await db.syncMeta.get('currentUserId');
        if (cachedUser && cachedUser.value !== userId) {
          await clearLocalData();
        }

        // Store current user
        await db.syncMeta.put({ key: 'currentUserId', value: userId! });

        // Initial pull for syncing plans only. Free never auto-restores: backup
        // recovery is always an explicit action (Settings -> Backup -> Restore).
        const lastPull = await db.syncMeta.get('lastPullTimestamp');

        if (canSync && !lastPull && isOnline) {
          await performInitialSync(convexClient);
        }

        if (mounted) {
          setIsInitialSyncing(false);
        }
      } catch (error) {
        reportError('network', error, { phase: 'initialSync' });
        if (mounted) {
          setIsInitialSyncing(false);
          setInitialSyncFailed(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [isOnline, userId, isSignedIn, canSync]);

  // Start sync engine when online -- Pro/Lifetime only. Free never syncs, so the
  // engine is never created (syncEngineRef stays null and every sync path no-ops).
  useEffect(() => {
    if (isInitialSyncing || !isSignedIn || !canSync) return;

    const engine = new SyncEngine(convexClient);
    syncEngineRef.current = engine;

    if (isOnline) {
      engine.start();
    }

    return () => {
      engine.stop();
      syncEngineRef.current = null;
    };
  }, [isOnline, isInitialSyncing, isSignedIn, canSync]);

  // Daily point-in-time snapshot for EVERY user. For Free it's the only cloud
  // copy (survives a browser-clear / device loss). For Pro it's a rollback point
  // that live sync can't give -- an accidental mass-delete syncs everywhere
  // instantly, but yesterday's snapshot is still recoverable. maybeBackup()
  // self-throttles to once per 24h and skips unchanged data, so these are just
  // chances to fire once a day has elapsed: after load, hourly, and on tab hide.
  useEffect(() => {
    if (isInitialSyncing || !isSignedIn || !isOnline) return;
    const initial = setTimeout(() => { maybeBackup(); }, 8_000);
    const interval = setInterval(() => { maybeBackup(); }, 60 * 60 * 1000);
    const onHide = () => { if (document.visibilityState === 'hidden') maybeBackup(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [isInitialSyncing, isSignedIn, isOnline]);

  // Keep the stored UTC offset current (DST transitions, travel) so the server
  // cron keeps spawning routines in the user's actual local frame. Only when a
  // settings row already exists - defaults need no row.
  useEffect(() => {
    if (isInitialSyncing || !userId) return;
    (async () => {
      try {
        const row = await db.userSettings.filter((s) => s.userId === userId && !s._deleted).first();
        if (!row) return;
        const offset = currentUtcOffsetMinutes();
        if (row.utcOffsetMinutes === offset) return;
        const now = Date.now();
        await db.transaction('rw', [db.userSettings, db.syncQueue], async () => {
          await db.userSettings.update(row._id, { utcOffsetMinutes: offset, updatedAt: now });
          if (isSyncEnabled()) {
            await db.syncQueue.add({
              entityType: 'userSettings', entityId: row._id, operation: 'update',
              data: { utcOffsetMinutes: offset, updatedAt: now },
              status: 'pending', retryCount: 0, createdAt: now,
            });
          }
        });
      } catch (e) {
        reportError('mutation', e, { phase: 'utcOffsetRefresh' });
      }
    })();
  }, [isInitialSyncing, userId]);

  // Trim the local activity log so the append-only audit table can't grow
  // unbounded on-device. Time entries (the actual timesheet data) are never
  // pruned. The pull cursor never re-fetches old rows, so pruned events don't
  // come back. Server rows are left for the retention window of a future
  // device; a server-side sweep can follow later.
  const canHistory = useCan('history');
  useEffect(() => {
    if (isInitialSyncing) return;
    const days = canHistory ? ACTIVITY_RETENTION_DAYS_PRO : ACTIVITY_RETENTION_DAYS_FREE;
    const timer = setTimeout(() => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      db.activityEvents
        .where('at')
        .below(cutoff)
        .delete()
        .catch((e) => reportError('mutation', e, { phase: 'activityPrune' }));
    }, 12_000);
    return () => clearTimeout(timer);
  }, [isInitialSyncing, canHistory]);

  // Start routine spawner
  useEffect(() => {
    if (isInitialSyncing) return;

    const cleanup = startRoutineSpawner();
    routineCleanupRef.current = cleanup;

    return () => {
      cleanup();
      routineCleanupRef.current = null;
    };
  }, [isInitialSyncing]);

  // Trigger push/pull when coming online
  useEffect(() => {
    if (isOnline && syncEngineRef.current) {
      syncEngineRef.current.pushSync();
      syncEngineRef.current.pullSync();
    }
  }, [isOnline]);

  const syncNow = async () => {
    const engine = syncEngineRef.current;
    if (!engine) return;
    await engine.pushSync();
    await engine.pullSync();
  };

  // Show loading during first-ever sync
  if (isInitialSyncing) {
    return <LoadingScreen message="Syncing data..." />;
  }

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSyncCount, failedSyncCount, lastSyncTime, isInitialSyncing, initialSyncFailed, syncNow }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
