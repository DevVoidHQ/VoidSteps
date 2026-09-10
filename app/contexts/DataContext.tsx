import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getLogicalDayStart } from "@/lib/calculate-next-occurrence";
import type { Path, Step, Routine, Reminder } from "@/types";
import type { LocalUserSettings } from "@/lib/db";

interface DataContextType {
  paths: Path[] | undefined;
  activePaths: Path[] | undefined;
  archivedPaths: Path[] | undefined;
  rootPaths: Path[] | undefined;
  routines: Routine[] | undefined;
  reminders: Reminder[] | undefined;
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
  // Timer. Several steps can run at once, so this is a set rather than an id.
  // Ordered newest start first, which makes [0] the one the timer bar adopts.
  runningTimerStepIds: string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Enrich a local step with its path object
function enrichStepWithPath(step: any, pathsMap: Map<string, any>): Step {
  const path = step.pathId ? pathsMap.get(step.pathId) || null : null;
  return {
    ...step,
    path: path
      ? {
          _id: path._id,
          title: path.title,
          description: path.description,
          parentId: path.parentId || null,
          createdAt: path.createdAt,
          updatedAt: path.updatedAt,
        }
      : null,
    parentId: step.parentId || null,
    pathId: step.pathId || null,
  } as Step;
}

// Enrich a local routine with its path object
function enrichRoutineWithPath(routine: any, pathsMap: Map<string, any>): Routine {
  const path = routine.pathId ? pathsMap.get(routine.pathId) || null : null;
  return {
    ...routine,
    path: path
      ? {
          _id: path._id,
          title: path.title,
          description: path.description,
          parentId: path.parentId || null,
          createdAt: path.createdAt,
          updatedAt: path.updatedAt,
        }
      : null,
    pathId: routine.pathId || null,
  } as Routine;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read all non-deleted data from IndexedDB reactively
  const localSteps = useLiveQuery(() => db.steps.toArray(), []);

  const localPaths = useLiveQuery(() => db.paths.toArray(), []);

  const localRoutines = useLiveQuery(() => db.routines.toArray(), []);

  const localReminders = useLiveQuery(() => db.reminders.toArray(), []);

  // Read user settings (single-user app, take first)
  const userSettings = useLiveQuery(() => db.userSettings.toCollection().first(), []);

  // Build paths map for enrichment
  const pathsMap = useMemo(() => {
    if (!localPaths) return new Map();
    return new Map(localPaths.map((p) => [p._id, p]));
  }, [localPaths]);

  // Transform local paths to app Path type
  const paths = useMemo(() => {
    if (!localPaths) return undefined;
    return localPaths.map((p) => ({
      ...p,
      parentId: p.parentId || null,
    })) as Path[];
  }, [localPaths]);

  // Active paths (non-archived)
  const activePaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter((p) => !p.archived);
  }, [paths]);

  // Archived paths
  const archivedPaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter((p) => p.archived);
  }, [paths]);

  // Root paths
  const rootPaths = useMemo(() => {
    if (!paths) return undefined;
    return paths.filter((path) => !path.parentId);
  }, [paths]);

  // Transform and enrich routines
  const routines = useMemo(() => {
    if (!localRoutines) return undefined;
    return localRoutines.map((r) => enrichRoutineWithPath(r, pathsMap));
  }, [localRoutines, pathsMap]);

  // Reminders need no enrichment - they're standalone date markers.
  const reminders = useMemo(
    () => (localReminders ? (localReminders as unknown as Reminder[]) : undefined),
    [localReminders]
  );

  // All enriched steps
  const allSteps = useMemo(() => {
    if (!localSteps) return undefined;
    return localSteps.map((s) => enrichStepWithPath(s, pathsMap));
  }, [localSteps, pathsMap]);

  // Start of "today" for task semantics: the user's configured end-of-day
  // turnover (default midnight), NOT necessarily calendar midnight - at 1am
  // with a 3am turnover, "today" is still yesterday. Kept fresh with a
  // minute tick + visibility kick: the old `useMemo(..., [])` froze the
  // boundary at mount, so a long-lived tab never rolled over.
  const turnoverMinutes = userSettings?.dayTurnoverMinutes ?? 0;
  const [startOfToday, setStartOfToday] = useState(() =>
    getLogicalDayStart(Date.now(), { turnoverMinutes })
  );
  useEffect(() => {
    const tick = () =>
      setStartOfToday((prev) => {
        const current = getLogicalDayStart(Date.now(), { turnoverMinutes });
        return current !== prev ? current : prev;
      });
    tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [turnoverMinutes]);

  // Active steps: not completed, not failed, not archived, startDate <= startOfToday or no startDate
  const activeSteps = useMemo(() => {
    if (!allSteps) return undefined;
    const active = allSteps.filter((step) => {
      if (step.archived) return false;
      if (step.completed) return false;
      if (step.failed) return false;
      if (step.startDate && step.startDate > startOfToday) return false;
      return true;
    });
    // Sort by sortOrder ascending, fallback to createdAt
    return active.sort((a, b) => {
      const orderA = a.sortOrder ?? (typeof a.createdAt === "number" ? a.createdAt : 0);
      const orderB = b.sortOrder ?? (typeof b.createdAt === "number" ? b.createdAt : 0);
      return orderA - orderB;
    });
  }, [allSteps, startOfToday]);

  // Failed steps (exclude archived)
  const failedSteps = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps.filter((step) => step.failed === true && !step.archived);
  }, [allSteps]);

  // Completed steps today (exclude archived)
  const completedStepsToday = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps.filter(
      (step) =>
        !step.archived &&
        step.completed &&
        step.completedAt !== undefined &&
        (typeof step.completedAt === "number" ? step.completedAt : 0) >= startOfToday
    );
  }, [allSteps, startOfToday]);

  // Upcoming steps: not completed, not failed, not archived, startDate > startOfToday
  const upcomingSteps = useMemo(() => {
    if (!allSteps) return undefined;
    return allSteps
      .filter((step) => {
        if (step.archived) return false;
        if (step.completed) return false;
        if (step.failed) return false;
        if (!step.startDate || step.startDate <= startOfToday) return false;
        return true;
      })
      .sort((a, b) => (a.startDate ?? 0) - (b.startDate ?? 0));
  }, [allSteps, startOfToday]);

  const isLoading =
    localSteps === undefined || localPaths === undefined || localRoutines === undefined;

  // Every step with a running timer, newest start first. Per-card state reads
  // step.timerStartedAt directly, so this exists for the surfaces that need to
  // know about the whole set: the timer bar, focus mode and the Day Log.
  const runningTimerStepIds = useMemo(() => {
    if (!allSteps) return [];
    return allSteps
      .filter((s) => s.timerStartedAt != null)
      .sort((a, b) => (b.timerStartedAt ?? 0) - (a.timerStartedAt ?? 0))
      .map((s) => s._id);
  }, [allSteps]);

  // isStepUpcoming helper - same turnover boundary as activeSteps/upcomingSteps
  // so a deferred step can't read "upcoming" in one place and "active" in another.
  const isStepUpcoming = useCallback(
    (step: Step) => {
      return !!step.startDate && step.startDate > startOfToday;
    },
    [startOfToday]
  );

  // No-op optimistic update functions (writes are now instant via IndexedDB)
  const applyOptimisticUpdate = useCallback((_id: string, _updates: Partial<Step>) => {}, []);
  const clearOptimisticUpdate = useCallback((_id: string) => {}, []);
  const applyOptimisticDelete = useCallback((_id: string) => {}, []);
  const clearOptimisticDelete = useCallback((_id: string) => {}, []);

  const value = useMemo(
    () => ({
      paths,
      activePaths,
      archivedPaths,
      rootPaths,
      routines,
      reminders,
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
      runningTimerStepIds,
    }),
    [
      paths,
      activePaths,
      archivedPaths,
      rootPaths,
      routines,
      reminders,
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
      runningTimerStepIds,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};
