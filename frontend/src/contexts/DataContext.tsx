import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  usePaths,
  usePathways,
  useRoutines,
  useSteps,
  useActiveSteps,
  useFailedSteps,
  useCompletedStepsToday
} from '@/lib/convex-hooks';
import type { Path, Pathway, Routine, Step } from '@/types';

interface OptimisticUpdate {
  id: string;
  updates: Partial<Step>;
  timestamp: number;
}

interface DataContextType {
  pathways: Pathway[] | undefined;
  paths: Path[] | undefined;
  routines: Routine[] | undefined;
  allSteps: Step[] | undefined;
  activeSteps: Step[] | undefined;
  failedSteps: Step[] | undefined;
  completedStepsToday: Step[] | undefined;
  isLoading: boolean;
  // Optimistic update functions
  applyOptimisticUpdate: (id: string, updates: Partial<Step>) => void;
  applyOptimisticDelete: (id: string) => void;
  clearOptimisticUpdate: (id: string) => void;
  clearOptimisticDelete: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathways = usePathways();
  const paths = usePaths();
  const routines = useRoutines();
  const serverAllSteps = useSteps();
  const serverActiveSteps = useActiveSteps();
  const serverFailedSteps = useFailedSteps();
  const serverCompletedStepsToday = useCompletedStepsToday();

  // Optimistic state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // Helper to apply optimistic state to a step array
  const applyOptimisticToSteps = useCallback((steps: Step[] | undefined): Step[] | undefined => {
    if (!steps) return undefined;
    return steps
      .filter(step => !pendingDeletes.has(step._id))
      .map(step => {
        const optimistic = optimisticUpdates.get(step._id);
        return optimistic ? { ...step, ...optimistic.updates } : step;
      });
  }, [optimisticUpdates, pendingDeletes]);

  // Apply optimistic state to all step arrays
  const allSteps = useMemo(() => applyOptimisticToSteps(serverAllSteps), [applyOptimisticToSteps, serverAllSteps]);
  const activeSteps = useMemo(() => applyOptimisticToSteps(serverActiveSteps), [applyOptimisticToSteps, serverActiveSteps]);
  const failedSteps = useMemo(() => applyOptimisticToSteps(serverFailedSteps), [applyOptimisticToSteps, serverFailedSteps]);
  const completedStepsToday = useMemo(() => applyOptimisticToSteps(serverCompletedStepsToday), [applyOptimisticToSteps, serverCompletedStepsToday]);

  const isLoading =
    pathways === undefined ||
    paths === undefined ||
    routines === undefined ||
    serverAllSteps === undefined ||
    serverActiveSteps === undefined ||
    serverFailedSteps === undefined ||
    serverCompletedStepsToday === undefined;

  // Optimistic update functions
  const applyOptimisticUpdate = useCallback((id: string, updates: Partial<Step>) => {
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(id, { id, updates, timestamp: Date.now() });
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

  const value = useMemo(
    () => ({
      pathways,
      paths,
      routines,
      allSteps,
      activeSteps,
      failedSteps,
      completedStepsToday,
      isLoading,
      applyOptimisticUpdate,
      applyOptimisticDelete,
      clearOptimisticUpdate,
      clearOptimisticDelete,
    }),
    [pathways, paths, routines, allSteps, activeSteps, failedSteps, completedStepsToday, isLoading,
     applyOptimisticUpdate, applyOptimisticDelete, clearOptimisticUpdate, clearOptimisticDelete]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
