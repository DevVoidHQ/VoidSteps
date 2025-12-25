import React, { createContext, useContext, useMemo } from 'react';
import {
  usePaths,
  useRoutines,
  useSteps,
  useActiveSteps,
  useFailedSteps,
  useCompletedStepsToday
} from '@/lib/convex-hooks';
import type { Path, Routine, Step } from '@/types';

interface DataContextType {
  paths: Path[] | undefined;
  routines: Routine[] | undefined;
  allSteps: Step[] | undefined;
  activeSteps: Step[] | undefined;
  failedSteps: Step[] | undefined;
  completedStepsToday: Step[] | undefined;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const paths = usePaths();
  const routines = useRoutines();
  const allSteps = useSteps();
  const activeSteps = useActiveSteps();
  const failedSteps = useFailedSteps();
  const completedStepsToday = useCompletedStepsToday();

  const isLoading =
    paths === undefined ||
    routines === undefined ||
    allSteps === undefined ||
    activeSteps === undefined ||
    failedSteps === undefined ||
    completedStepsToday === undefined;

  const value = useMemo(
    () => ({
      paths,
      routines,
      allSteps,
      activeSteps,
      failedSteps,
      completedStepsToday,
      isLoading
    }),
    [paths, routines, allSteps, activeSteps, failedSteps, completedStepsToday, isLoading]
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
