// Helper hooks and utilities for Convex
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Step, Path, Routine } from "@/types";

// Transform Convex data to match our application types
const transformStep = (step: any): Step => ({
  ...step,
  _id: step._id.toString(),
  pathId: step.pathId?.toString() || null,
  path: step.path ? transformPath(step.path) : null,
});

const transformPath = (path: any): Path => ({
  ...path,
  _id: path._id.toString(),
});

const transformRoutine = (routine: any): Routine => ({
  ...routine,
  _id: routine._id.toString(),
});

// Steps
export const useSteps = () => {
  const steps = useQuery(api.steps.getSteps);
  return steps?.map(transformStep);
};

export const useStep = (id: string | null) => {
  const step = useQuery(
    api.steps.getStep,
    id ? { id: id as Id<"steps"> } : "skip"
  );
  return step ? transformStep(step) : undefined;
};

export const useCreateStep = () => useMutation(api.steps.createStep);
export const useUpdateStep = () => useMutation(api.steps.updateStep);
export const useDeleteStep = () => useMutation(api.steps.deleteStep);
export const useToggleStepCompletion = () =>
  useMutation(api.steps.toggleStepCompletion);

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

// Routines
export const useRoutines = () => {
  const routines = useQuery(api.routines.getRoutines);
  return routines?.map(transformRoutine);
};

export const useRoutine = (id: string | null) => {
  const routine = useQuery(
    api.routines.getRoutine,
    id ? { id: id as Id<"routines"> } : "skip"
  );
  return routine ? transformRoutine(routine) : undefined;
};

export const useCreateRoutine = () => useMutation(api.routines.createRoutine);
export const useUpdateRoutine = () => useMutation(api.routines.updateRoutine);
export const useDeleteRoutine = () => useMutation(api.routines.deleteRoutine);
export const useExecuteRoutine = () => useMutation(api.routines.executeRoutine);

// Auth
export const useLogin = () => useMutation(api.auth.login);
export const useVerify = (token: string | null) =>
  useQuery(api.auth.verify, token ? { token } : "skip");
