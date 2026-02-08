import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useConvex } from 'convex/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync-engine';
import { performInitialSync } from '@/lib/initial-sync';
import { startRoutineSpawner } from '@/lib/routine-spawner';
import { useOnlineStatus } from '@/lib/online-status';
import LoadingScreen from '@/components/LoadingScreen';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
  isInitialSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const convexClient = useConvex();
  const isOnline = useOnlineStatus();
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const routineCleanupRef = useRef<(() => void) | null>(null);

  // Reactive pending sync count
  const pendingSyncCount = useLiveQuery(
    () => db.syncQueue.where('status').anyOf('pending', 'in-progress').count(),
    [],
    0
  );

  // Reactive last sync time
  const lastSyncMeta = useLiveQuery(
    () => db.syncMeta.get('lastPullTimestamp'),
    []
  );
  const lastSyncTime = (lastSyncMeta?.value as number) ?? null;

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Check if we need initial sync
        const lastPull = await db.syncMeta.get('lastPullTimestamp');

        if (!lastPull && isOnline) {
          // First-ever load: populate IndexedDB from Convex
          await performInitialSync(convexClient);
        }

        if (mounted) {
          setIsInitialSyncing(false);
        }
      } catch (error) {
        console.error('Initial sync error:', error);
        // Even if sync fails, let the app proceed (may have stale local data)
        if (mounted) {
          setIsInitialSyncing(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [convexClient, isOnline]);

  // Start sync engine when online
  useEffect(() => {
    if (isInitialSyncing) return;

    const engine = new SyncEngine(convexClient);
    syncEngineRef.current = engine;

    if (isOnline) {
      engine.start();
    }

    return () => {
      engine.stop();
      syncEngineRef.current = null;
    };
  }, [convexClient, isOnline, isInitialSyncing]);

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
    <OfflineContext.Provider value={{ isOnline, pendingSyncCount, lastSyncTime, isInitialSyncing }}>
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
