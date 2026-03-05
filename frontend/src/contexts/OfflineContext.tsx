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
import LoadingScreen from '@/components/LoadingScreen';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  lastSyncTime: number | null;
  isInitialSyncing: boolean;
  initialSyncFailed: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

async function clearLocalData() {
  await db.transaction('rw', [db.steps, db.paths, db.routines, db.pathways, db.userSettings, db.syncQueue, db.syncMeta], async () => {
    await db.steps.clear();
    await db.paths.clear();
    await db.routines.clear();
    await db.pathways.clear();
    await db.userSettings.clear();
    await db.syncQueue.clear();
    await db.syncMeta.clear();
  });
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isOnline = useOnlineStatus();
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

  // Initialize on mount — wait for Convex auth, check if user changed
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

        // Check if we need initial sync
        const lastPull = await db.syncMeta.get('lastPullTimestamp');

        if (!lastPull && isOnline) {
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
  }, [isOnline, userId, isSignedIn]);

  // Start sync engine when online
  useEffect(() => {
    if (isInitialSyncing || !isSignedIn) return;

    const engine = new SyncEngine(convexClient);
    syncEngineRef.current = engine;

    if (isOnline) {
      engine.start();
    }

    return () => {
      engine.stop();
      syncEngineRef.current = null;
    };
  }, [isOnline, isInitialSyncing, isSignedIn]);

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

  // Show loading during first-ever sync
  if (isInitialSyncing) {
    return <LoadingScreen message="Syncing data..." />;
  }

  return (
    <OfflineContext.Provider value={{ isOnline, pendingSyncCount, failedSyncCount, lastSyncTime, isInitialSyncing, initialSyncFailed }}>
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
