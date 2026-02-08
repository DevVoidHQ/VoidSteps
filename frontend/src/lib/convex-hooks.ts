// Helper hooks and utilities for Convex
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Step, Path, Pathway, Routine } from "@/types";

// Transform Convex data to match our application types
const transformStep = (step: any): Step => ({
  ...step,
  _id: step._id.toString(),
  pathId: step.pathId?.toString() || null,
  path: step.path ? transformPath(step.path) : null,
  parentId: step.parentId?.toString() || null,
});

const transformPath = (path: any): Path => ({
  ...path,
  _id: path._id.toString(),
  parentId: path.parentId?.toString() || null,
  connectedPathIds: path.connectedPathIds?.map((id: any) => id.toString()) || [],
  connectedStepIds: path.connectedStepIds?.map((id: any) => id.toString()) || [],
});

const transformPathway = (pathway: any): Pathway => ({
  ...pathway,
  _id: pathway._id.toString(),
  parentId: pathway.parentId?.toString() || null,
  pathIds: pathway.pathIds?.map((id: any) => id.toString()) || [],
});

const transformRoutine = (routine: any): Routine => ({
  ...routine,
  _id: routine._id.toString(),
  pathId: routine.pathId?.toString() || null,
  path: routine.path ? transformPath(routine.path) : null,
});

// Steps
export const useSteps = () => {
  const steps = useQuery(api.steps.getSteps);
  return steps?.map(transformStep);
};

export const useActiveSteps = () => {
  const steps = useQuery(api.steps.getActiveSteps);
  return steps?.map(transformStep);
};

export const useCompletedStepsToday = () => {
  // Calculate start of today in user's local timezone
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDayTimestamp = startOfToday.getTime();

  const steps = useQuery(api.steps.getCompletedStepsToday, { startOfDayTimestamp });
  return steps?.map(transformStep);
};

export const useFailedSteps = () => {
  const steps = useQuery(api.steps.getFailedSteps);
  return steps?.map(transformStep);
};

export const useUpcomingSteps = () => {
  const steps = useQuery(api.steps.getUpcomingSteps);
  return steps?.map(transformStep);
};

export const useStep = (id: string | null) => {
  const step = useQuery(
    api.steps.getStep,
    id ? { id: id as Id<"steps"> } : "skip"
  );
  return step ? transformStep(step) : undefined;
};

export const useChildSteps = (parentId: string | null) => {
  const steps = useQuery(
    api.steps.getChildSteps,
    parentId ? { parentId: parentId as Id<"steps"> } : "skip"
  );
  return steps?.map(transformStep);
};

export const useCreateStep = () => useMutation(api.steps.createStep);
export const useUpdateStep = () => useMutation(api.steps.updateStep);
export const useDeleteStep = () => useMutation(api.steps.deleteStep);
export const useToggleStepCompletion = () =>
  useMutation(api.steps.toggleStepCompletion);
export const useToggleStepFailed = () =>
  useMutation(api.steps.toggleStepFailed);
export const useUpdateStepParent = () =>
  useMutation(api.steps.updateStepParent);

// Paths
export const usePaths = () => {
  const paths = useQuery(api.paths.getPaths);
  return paths?.map(transformPath);
};

export const usePath = (id: string | null) => {
  const path = useQuery(
    api.paths.getPath,
    id ? { id: id as Id<"paths"> } : "skip"
  );
  return path ? transformPath(path) : undefined;
};

export const useCreatePath = () => useMutation(api.paths.createPath);
export const useUpdatePath = () => useMutation(api.paths.updatePath);
export const useDeletePath = () => useMutation(api.paths.deletePath);

// Root and child paths
export const useRootPaths = () => {
  const paths = useQuery(api.paths.getRootPaths);
  return paths?.map(transformPath);
};

export const useChildPaths = (parentId: string | null) => {
  const paths = useQuery(
    api.paths.getChildPaths,
    parentId ? { parentId: parentId as Id<"paths"> } : "skip"
  );
  return paths?.map(transformPath);
};

// Pathways
export const usePathways = () => {
  const pathways = useQuery(api.pathways.getPathways);
  return pathways?.map(transformPathway);
};

export const usePathway = (id: string | null) => {
  const pathway = useQuery(
    api.pathways.getPathway,
    id ? { id: id as Id<"pathways"> } : "skip"
  );
  return pathway ? transformPathway(pathway) : undefined;
};

export const useCreatePathway = () => useMutation(api.pathways.createPathway);
export const useUpdatePathway = () => useMutation(api.pathways.updatePathway);
export const useDeletePathway = () => useMutation(api.pathways.deletePathway);

// Routines
export const useRoutines = () => {
  const routines = useQuery(api.routines.getRoutines);
  return routines?.map(transformRoutine);
};

export const useCreateRoutine = () => useMutation(api.routines.createRoutine);
export const useUpdateRoutine = () => useMutation(api.routines.updateRoutine);
export const useDeleteRoutine = () => useMutation(api.routines.deleteRoutine);

// User Settings
export const useUserSettings = (userId: string | null) =>
  useQuery(api.userSettings.getUserSettings, userId ? { userId } : "skip");
export const useUpdateUserSettings = () => useMutation(api.userSettings.updateUserSettings);

// Step Reordering
export const useReorderSteps = () => useMutation(api.steps.reorderSteps);

// Timer
export const useStartTimer = () => useMutation(api.steps.startTimer);
export const useStopTimer = () => useMutation(api.steps.stopTimer);
