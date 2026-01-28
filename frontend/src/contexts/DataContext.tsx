import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  usePaths,
  usePathways,
  useRoutines,
  useSteps,
  useActiveSteps,
  useFailedSteps,
  useCompletedStepsToday,
  useUpcomingSteps
} from '@/lib/convex-hooks';
import { isUpcoming as isStepUpcomingUtil } from '@/lib/date-utils';
import type { Path, Pathway, Step, Routine } from '@/types';

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
  upcomingSteps: Step[] | undefined;
  isLoading: boolean;
  // Optimistic update functions
  applyOptimisticUpdate: (id: string, updates: Partial<Step>) => void;
  applyOptimisticDelete: (id: string) => void;
  clearOptimisticUpdate: (id: string) => void;
  clearOptimisticDelete: (id: string) => void;
  // Helpers
  isStepUpcoming: (step: Step) => boolean;
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
  const serverUpcomingSteps = useUpcomingSteps();

  // Optimistic state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  // Helper to apply optimistic updates to a single step
  const applyOptimisticToStep = useCallback((step: Step): Step => {
    const optimistic = optimisticUpdates.get(step._id);
    return optimistic ? { ...step, ...optimistic.updates } : step;
  }, [optimisticUpdates]);

  // Check if a step should be considered "active" (not completed, not failed)
  const isStepActive = useCallback((step: Step): boolean => {
    const optimistic = optimisticUpdates.get(step._id);
    const completed = optimistic?.updates.completed ?? step.completed;
    const failed = optimistic?.updates.failed ?? step.failed;
    return !completed && !failed;
  }, [optimisticUpdates]);

  // Check if a step should be considered "failed"
  const isStepFailed = useCallback((step: Step): boolean => {
    const optimistic = optimisticUpdates.get(step._id);
    return optimistic?.updates.failed ?? step.failed ?? false;
  }, [optimisticUpdates]);

  // Check if a step should be considered "completed"
  const isStepCompleted = useCallback((step: Step): boolean => {
    const optimistic = optimisticUpdates.get(step._id);
    return optimistic?.updates.completed ?? step.completed ?? false;
  }, [optimisticUpdates]);

  // Check if a step should be considered "upcoming" (startDate in the future)
  const isStepUpcoming = useCallback((step: Step): boolean => {
    const optimistic = optimisticUpdates.get(step._id);
    const startDate = optimistic?.updates.startDate ?? step.startDate;
    return isStepUpcomingUtil(startDate);
  }, [optimisticUpdates]);

  // Build unified step pool from all server sources (deduplicated)
  const allServerSteps = useMemo(() => {
    const stepMap = new Map<string, Step>();
    // Add from all sources to create a deduplicated pool
    serverAllSteps?.forEach(s => stepMap.set(s._id, s));
    serverActiveSteps?.forEach(s => stepMap.set(s._id, s));
    serverFailedSteps?.forEach(s => stepMap.set(s._id, s));
    serverCompletedStepsToday?.forEach(s => stepMap.set(s._id, s));
    serverUpcomingSteps?.forEach(s => stepMap.set(s._id, s));
    return Array.from(stepMap.values());
  }, [serverAllSteps, serverActiveSteps, serverFailedSteps, serverCompletedStepsToday, serverUpcomingSteps]);

  // Apply optimistic state and filter into correct lists
  const allSteps = useMemo(() => {
    if (!serverAllSteps) return undefined;
    return serverAllSteps
      .filter(step => !pendingDeletes.has(step._id))
      .map(applyOptimisticToStep);
  }, [serverAllSteps, pendingDeletes, applyOptimisticToStep]);

  // Active steps: not completed, not failed (respecting optimistic state)
  const activeSteps = useMemo(() => {
    if (!serverActiveSteps) return undefined;

    // Start with server active steps, filter by optimistic state
    const fromServer = serverActiveSteps
      .filter(step => !pendingDeletes.has(step._id) && isStepActive(step))
      .map(applyOptimisticToStep);

    // Also include steps that were completed/failed but are now optimistically active
    const reactivated = allServerSteps
      .filter(step => {
        if (pendingDeletes.has(step._id)) return false;
        // Step wasn't in active list but is now optimistically active
        const wasInActive = serverActiveSteps.some(s => s._id === step._id);
        if (wasInActive) return false;
        return isStepActive(step);
      })
      .map(applyOptimisticToStep);

    return [...fromServer, ...reactivated];
  }, [serverActiveSteps, allServerSteps, pendingDeletes, isStepActive, applyOptimisticToStep]);

  // Failed steps: failed=true (respecting optimistic state)
  const failedSteps = useMemo(() => {
    if (!serverFailedSteps) return undefined;

    // Start with server failed steps that are still failed
    const fromServer = serverFailedSteps
      .filter(step => !pendingDeletes.has(step._id) && isStepFailed(step))
      .map(applyOptimisticToStep);

    // Include steps that are now optimistically failed
    const newlyFailed = allServerSteps
      .filter(step => {
        if (pendingDeletes.has(step._id)) return false;
        const wasInFailed = serverFailedSteps.some(s => s._id === step._id);
        if (wasInFailed) return false;
        return isStepFailed(step);
      })
      .map(applyOptimisticToStep);

    return [...fromServer, ...newlyFailed];
  }, [serverFailedSteps, allServerSteps, pendingDeletes, isStepFailed, applyOptimisticToStep]);

  // Completed steps today: completed=true (respecting optimistic state)
  const completedStepsToday = useMemo(() => {
    if (!serverCompletedStepsToday) return undefined;

    // Start with server completed steps that are still completed
    const fromServer = serverCompletedStepsToday
      .filter(step => !pendingDeletes.has(step._id) && isStepCompleted(step))
      .map(applyOptimisticToStep);

    // Include steps that are now optimistically completed
    const newlyCompleted = allServerSteps
      .filter(step => {
        if (pendingDeletes.has(step._id)) return false;
        const wasInCompleted = serverCompletedStepsToday.some(s => s._id === step._id);
        if (wasInCompleted) return false;
        return isStepCompleted(step);
      })
      .map(applyOptimisticToStep);

    return [...fromServer, ...newlyCompleted];
  }, [serverCompletedStepsToday, allServerSteps, pendingDeletes, isStepCompleted, applyOptimisticToStep]);

  // Upcoming steps: have startDate in the future (respecting optimistic state)
  const upcomingSteps = useMemo(() => {
    if (!serverUpcomingSteps) return undefined;

    // Start with server upcoming steps that are still upcoming
    const fromServer = serverUpcomingSteps
      .filter(step => !pendingDeletes.has(step._id) && isStepUpcoming(step))
      .map(applyOptimisticToStep);

    // Include steps that are now optimistically upcoming
    const newlyUpcoming = allServerSteps
      .filter(step => {
        if (pendingDeletes.has(step._id)) return false;
        const wasInUpcoming = serverUpcomingSteps.some(s => s._id === step._id);
        if (wasInUpcoming) return false;
        return isStepUpcoming(step);
      })
      .map(applyOptimisticToStep);

    // Sort by startDate ascending
    return [...fromServer, ...newlyUpcoming].sort((a, b) => {
      return (a.startDate ?? 0) - (b.startDate ?? 0);
    });
  }, [serverUpcomingSteps, allServerSteps, pendingDeletes, isStepUpcoming, applyOptimisticToStep]);

  const isLoading =
    pathways === undefined ||
    paths === undefined ||
    routines === undefined ||
    serverAllSteps === undefined ||
    serverActiveSteps === undefined ||
    serverFailedSteps === undefined ||
    serverCompletedStepsToday === undefined ||
    serverUpcomingSteps === undefined;

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
      upcomingSteps,
      isLoading,
      applyOptimisticUpdate,
      applyOptimisticDelete,
      clearOptimisticUpdate,
      clearOptimisticDelete,
      isStepUpcoming,
    }),
    [pathways, paths, routines, allSteps, activeSteps, failedSteps, completedStepsToday, upcomingSteps, isLoading,
     applyOptimisticUpdate, applyOptimisticDelete, clearOptimisticUpdate, clearOptimisticDelete, isStepUpcoming]
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
