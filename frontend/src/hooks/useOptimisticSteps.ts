import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { Step } from '@/types';

interface OptimisticUpdate {
  id: string;
  updates: Partial<Step>;
  timestamp: number;
}

export function useOptimisticSteps(serverSteps: Step[] | undefined) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(
    new Map()
  );
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // Track server data version to auto-clear stale optimistic updates
  const prevServerStepsRef = useRef<Step[] | undefined>(serverSteps);

  // Auto-clear optimistic updates when server data changes
  useEffect(() => {
    if (serverSteps && serverSteps !== prevServerStepsRef.current) {
      // Clear optimistic updates that have been reconciled with server
      setOptimisticUpdates(prev => {
        const now = Date.now();
        const next = new Map<string, OptimisticUpdate>();

        prev.forEach((update, id) => {
          const serverStep = serverSteps.find(s => s._id === id);
          if (serverStep) {
            // Check if server has caught up (data is newer than optimistic update)
            const serverUpdatedAt = typeof serverStep.updatedAt === 'number'
              ? serverStep.updatedAt
              : new Date(serverStep.updatedAt).getTime();

            // Keep optimistic update only if it's recent and server hasn't caught up
            if (update.timestamp > serverUpdatedAt && now - update.timestamp < 5000) {
              next.set(id, update);
            }
          }
        });

        return next;
      });

      // Clear pending deletes for items that no longer exist
      setPendingDeletes(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          if (serverSteps.some(s => s._id === id)) {
            next.add(id);
          }
        });
        return next;
      });

      prevServerStepsRef.current = serverSteps;
    }
  }, [serverSteps]);

  // Merge server data with optimistic updates
  const steps = useMemo(() => {
    if (!serverSteps) return undefined;

    // Filter out pending deletes and apply optimistic updates
    return serverSteps
      .filter(step => !pendingDeletes.has(step._id))
      .map(step => {
        const optimistic = optimisticUpdates.get(step._id);
        if (optimistic) {
          return { ...step, ...optimistic.updates };
        }
        return step;
      });
  }, [serverSteps, optimisticUpdates, pendingDeletes]);

  const applyOptimisticUpdate = useCallback((id: string, updates: Partial<Step>) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(id, {
        id,
        updates,
        timestamp: Date.now(),
      });
      return next;
    });
  }, []);

  const clearOptimisticUpdate = useCallback((id: string) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const applyOptimisticDelete = useCallback((id: string) => {
    setPendingDeletes(prev => new Set(prev).add(id));
  }, []);

  const clearOptimisticDelete = useCallback((id: string) => {
    setPendingDeletes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    steps,
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    applyOptimisticDelete,
    clearOptimisticDelete,
  };
}
