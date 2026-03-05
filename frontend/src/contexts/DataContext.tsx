import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { isUpcoming as isStepUpcomingUtil } from '@/lib/date-utils';
import type { Path, Pathway, Step, Routine } from '@/types';
import type { LocalUserSettings } from '@/lib/db';

interface DataContextType {
  pathways: Pathway[] | undefined;
  paths: Path[] | undefined;
  activePaths: Path[] | undefined;
  archivedPaths: Path[] | undefined;
  rootPaths: Path[] | undefined;
  routines: Routine[] | undefined;
  allSteps: Step[] | undefined;
  activeSteps: Step[] | undefined;
  failedSteps: Step[] | undefined;
  completedStepsToday: Step[] | undefined;
  upcomingSteps: Step[] | undefined;
  userSettings: LocalUserSettings | undefined;
  isLoading: boolean;
  // Legacy optimistic update functions (no-ops, kept for backward compatibility)
  applyOptimisticUpdate: (id: string, updates: Partial<Step>) => void;
  applyOptimisticDelete: (id: string) => void;
  clearOptimisticUpdate: (id: string) => void;
  clearOptimisticDelete: (id: string) => void;
  // Helpers
  isStepUpcoming: (step: Step) => boolean;
  // Timer
  activeTimerStepId: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Enrich a local step with its path object
function enrichStepWithPath(step: any, pathsMap: Map<string, any>): Step {
  const path = step.pathId ? pathsMap.get(step.pathId) || null : null;
  return {
    ...step,
    path: path ? {
      _id: path._id,
      title: path.title,
      description: path.description,
      parentId: path.parentId || null,
      connectedPathIds: path.connectedPathIds || [],
      connectedStepIds: path.connectedStepIds || [],
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    } : null,
    parentId: step.parentId || null,
    pathId: step.pathId || null,
  } as Step;
}

// Enrich a local routine with its path object
function enrichRoutineWithPath(routine: any, pathsMap: Map<string, any>): Routine {
  const path = routine.pathId ? pathsMap.get(routine.pathId) || null : null;
  return {
    ...routine,
    path: path ? {
      _id: path._id,
      title: path.title,
      description: path.description,
      parentId: path.parentId || null,
      connectedPathIds: path.connectedPathIds || [],
      connectedStepIds: path.connectedStepIds || [],
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    } : null,
    pathId: routine.pathId || null,
  } as Routine;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read all non-deleted data from IndexedDB reactively
  const localSteps = useLiveQuery(
    () => db.steps.filter(s => !s._deleted).toArray(),
    []
  );

  const localPaths = useLiveQuery(
    () => db.paths.filter(p => !p._deleted).toArray(),
    []
  );

  const localRoutines = useLiveQuery(
    () => db.routines.filter(r => !r._deleted).toArray(),
    []
  );

  const localPathways = useLiveQuery(
    () => db.pathways.filter(pw => !pw._deleted).toArray(),
    []
  );

  // Read user settings (single-user app, take first)
  const userSettings = useLiveQuery(
    () => db.userSettings.filter(s => !s._deleted).first(),
    []
  );

  // Build paths map for enrichment
  const pathsMap = useMemo(() => {
    if (!localPaths) return new Map();
    return new Map(localPaths.map(p => [p._id, p]));
  }, [localPaths]);

  // Transform local paths to app Path type
  const paths = useMemo(() => {
    if (!localPaths) return undefined;
    return localPaths.map(p => ({
      ...p,
      parentId: p.parentId || null,
      connectedPathIds: p.connectedPathIds || [],
      connectedStepIds: p.connectedStepIds || [],
    })) as Path[];
  }, [localPaths]);

  // Active paths (non-archived)
  const activePaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter(p => !p.archived);
  }, [paths]);

  // Archived paths
  const archivedPaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter(p => p.archived);
  }, [paths]);

  // Root paths
  const rootPaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter(path => !path.parentId);
  }, [paths]);

  // Transform local pathways
  const pathways = useMemo(() => {
    if (!localPathways) return undefined;
    return localPathways.map(pw => ({
      ...pw,
      parentId: pw.parentId || null,
      pathIds: pw.pathIds || [],
    })) as Pathway[];
  }, [localPathways]);

  // Transform and enrich routines
  const routines = useMemo(() => {
    if (!localRoutines) return undefined;
    return localRoutines.map(r => enrichRoutineWithPath(r, pathsMap));
  }, [localRoutines, pathsMap]);

  // All enriched steps
  const allSteps = useMemo(() => {
    if (!localSteps) return undefined;
    return localSteps.map(s => enrichStepWithPath(s, pathsMap));
  }, [localSteps, pathsMap]);

  // Start of today for filtering
  const startOfToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  // Active steps: not completed, not failed, not archived, startDate <= startOfToday or no startDate
  const activeSteps = useMemo(() => {
    if (!allSteps) return undefined;
    const active = allSteps.filter(step => {
      if (step.archived) return false;
      if (step.completed) return false;
      if (step.failed) return false;
      if (step.startDate && step.startDate > startOfToday) return false;
      return true;
    });
    // Sort by sortOrder ascending, fallback to createdAt
    return active.sort((a, b) => {
      const orderA = a.sortOrder ?? (typeof a.createdAt === 'number' ? a.createdAt : 0);
      const orderB = b.sortOrder ?? (typeof b.createdAt === 'number' ? b.createdAt : 0);
      return orderA - orderB;
    });
  }, [allSteps, startOfToday]);

  // Failed steps (exclude archived)
  const failedSteps = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps.filter(step => step.failed === true && !step.archived);
  }, [allSteps]);

  // Completed steps today (exclude archived)
  const completedStepsToday = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps.filter(step =>
      !step.archived &&
      step.completed &&
      step.completedAt !== undefined &&
      (typeof step.completedAt === 'number' ? step.completedAt : 0) >= startOfToday
    );
  }, [allSteps, startOfToday]);

  // Upcoming steps: not completed, not failed, not archived, startDate > startOfToday
  const upcomingSteps = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps
      .filter(step => {
        if (step.archived) return false;
        if (step.completed) return false;
        if (step.failed) return false;
        if (!step.startDate || step.startDate <= startOfToday) return false;
        return true;
      })
      .sort((a, b) => (a.startDate ?? 0) - (b.startDate ?? 0));
  }, [allSteps, startOfToday]);

  const isLoading =
    localSteps === undefined ||
    localPaths === undefined ||
    localRoutines === undefined ||
    localPathways === undefined;

  // Active timer step ID
  const activeTimerStepId = useMemo(() => {
    if (!allSteps) return null;
    const stepWithTimer = allSteps.find(s => s.timerStartedAt != null);
    return stepWithTimer?._id ?? null;
  }, [allSteps]);

  // isStepUpcoming helper
  const isStepUpcoming = useCallback((step: Step) => {
    return isStepUpcomingUtil(step.startDate);
  }, []);

  // No-op optimistic update functions (writes are now instant via IndexedDB)
  const applyOptimisticUpdate = useCallback((_id: string, _updates: Partial<Step>) => {}, []);
  const clearOptimisticUpdate = useCallback((_id: string) => {}, []);
  const applyOptimisticDelete = useCallback((_id: string) => {}, []);
  const clearOptimisticDelete = useCallback((_id: string) => {}, []);

  const value = useMemo(
    () => ({
      pathways,
      paths,
      activePaths,
      archivedPaths,
      rootPaths,
      routines,
      allSteps,
      activeSteps,
      failedSteps,
      completedStepsToday,
      upcomingSteps,
      userSettings,
      isLoading,
      applyOptimisticUpdate,
      applyOptimisticDelete,
      clearOptimisticUpdate,
      clearOptimisticDelete,
      isStepUpcoming,
      activeTimerStepId,
    }),
    [pathways, paths, activePaths, archivedPaths, rootPaths, routines, allSteps, activeSteps, failedSteps, completedStepsToday, upcomingSteps, userSettings, isLoading,
     applyOptimisticUpdate, applyOptimisticDelete, clearOptimisticUpdate, clearOptimisticDelete, isStepUpcoming, activeTimerStepId]
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
