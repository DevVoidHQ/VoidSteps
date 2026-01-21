import { useMemo } from "react";
import type { Step } from "@/types/index";

export interface StepWithChildren extends Step {
  children: Step[];
}

export interface StepHierarchy {
  rootSteps: Step[];
  getChildren: (parentId: string) => Step[];
  getProgress: (parentId: string) => { completed: number; total: number };
  childrenMap: Map<string, Step[]>;
  hasChildren: (stepId: string) => boolean;
}

/**
 * Hook to transform a flat array of steps into a hierarchical structure
 * Supports 1 level of nesting (parent -> children)
 */
export function useStepHierarchy(steps: Step[]): StepHierarchy {
  return useMemo(() => {
    // Build a map of parentId -> children
    const childrenMap = new Map<string, Step[]>();
    const rootSteps: Step[] = [];

    // First pass: categorize steps
    for (const step of steps) {
      if (step.parentId) {
        const existing = childrenMap.get(step.parentId) || [];
        existing.push(step);
        childrenMap.set(step.parentId, existing);
      } else {
        rootSteps.push(step);
      }
    }

    // Sort children by sortOrder
    for (const [parentId, children] of childrenMap) {
      children.sort((a, b) => {
        const orderA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const orderB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return orderA - orderB;
      });
      childrenMap.set(parentId, children);
    }

    const getChildren = (parentId: string): Step[] => {
      return childrenMap.get(parentId) || [];
    };

    const hasChildren = (stepId: string): boolean => {
      const children = childrenMap.get(stepId);
      return children !== undefined && children.length > 0;
    };

    const getProgress = (parentId: string): { completed: number; total: number } => {
      const children = childrenMap.get(parentId) || [];
      const completed = children.filter((c) => c.completed).length;
      return { completed, total: children.length };
    };

    return {
      rootSteps,
      getChildren,
      getProgress,
      childrenMap,
      hasChildren,
    };
  }, [steps]);
}
