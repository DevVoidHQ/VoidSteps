import { useState, useCallback, useMemo } from "react";
import type { Step, Path, Routine } from "@/types/index";
import {
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useExecuteRoutine,
  useReorderSteps,
  useUpdateStepParent,
} from "@/lib/convex-hooks";
import { useData } from "@/contexts/DataContext";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Input } from "@devvoid/ui";
import {
  Plus,
  Star,
  Search,
} from "lucide-react";
import { StepCard } from "@/components/StepCard";
import { DraggableStepList } from "@/components/DraggableStepList";

export default function Steps() {
  const {
    paths,
    routines,
    activeSteps,
    allSteps,
    failedSteps,
    applyOptimisticUpdate,
    applyOptimisticDelete,
    clearOptimisticDelete,
  } = useData();

  // Mutations
  const createStepMutation = useCreateStep();
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const executeRoutineMutation = useExecuteRoutine();
  const reorderStepsMutation = useReorderSteps();
  const updateStepParentMutation = useUpdateStepParent();

  // Form state for quick add
  const [quickAddValue, setQuickAddValue] = useState("");
  const [stepDescValue, setStepDescValue] = useState("");
  const [stepPathValue, setStepPathValue] = useState("");

  // UI state
  const [showCompletedSteps, setShowCompletedSteps] = useState(false);
  const [showFailedSteps, setShowFailedSteps] = useState(false);
  const [searchQuerySteps, setSearchQuerySteps] = useState("");
  const [selectedPathFilterSteps, setSelectedPathFilterSteps] = useState("");

  // Memoize paths for stable reference
  const memoizedPaths = useMemo(() => paths || [], [paths]);

  // Stable filter function
  const filterSteps = useCallback((
    steps: Step[],
    searchQuery: string,
    pathFilter: string
  ): Step[] => {
    return steps.filter((step: Step) => {
      const matchesSearch = !searchQuery ||
        step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (step.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const stepPathId = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null);
      const matchesPath = !pathFilter || stepPathId === pathFilter;

      return matchesSearch && matchesPath;
    });
  }, []);

  // Memoized filtered arrays
  const unfilteredPrioritySteps = useMemo(
    () => activeSteps?.filter((s: Step) => s.prioritizedToday) || [],
    [activeSteps]
  );

  const unfilteredRegularSteps = useMemo(
    () => activeSteps?.filter((s: Step) => !s.prioritizedToday) || [],
    [activeSteps]
  );

  const unfilteredCompletedSteps = useMemo(
    () => allSteps?.filter((s: Step) => s.completed) || [],
    [allSteps]
  );

  const unfilteredFailedStepsList = useMemo(
    () => failedSteps || [],
    [failedSteps]
  );

  const prioritySteps = useMemo(
    () => filterSteps(unfilteredPrioritySteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredPrioritySteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const regularSteps = useMemo(
    () => filterSteps(unfilteredRegularSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredRegularSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const completedSteps = useMemo(
    () => filterSteps(unfilteredCompletedSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredCompletedSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const failedStepsList = useMemo(
    () => filterSteps(unfilteredFailedStepsList, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredFailedStepsList, searchQuerySteps, selectedPathFilterSteps]
  );

  // Stable callbacks with optimistic updates
  const toggleStep = useCallback(async (id: string) => {
    const step = activeSteps?.find(s => s._id === id) || allSteps?.find(s => s._id === id);
    if (step) {
      applyOptimisticUpdate(id, {
        completed: !step.completed,
        failed: false,
        completedAt: !step.completed ? Date.now() : undefined,
      });
    }
    try {
      await toggleStepMutation({ id: id as Id<"steps"> });
    } catch (error) {
      console.error("Error toggling step:", error);
    }
  }, [activeSteps, allSteps, toggleStepMutation, applyOptimisticUpdate]);

  const toggleFailed = useCallback(async (id: string) => {
    const step = activeSteps?.find(s => s._id === id) || failedSteps?.find(s => s._id === id);
    if (step) {
      const currentFailed = step.failed ?? false;
      applyOptimisticUpdate(id, {
        failed: !currentFailed,
        completed: false,
        failedAt: !currentFailed ? Date.now() : undefined,
        completedAt: undefined,
      });
    }
    try {
      await toggleFailedMutation({ id: id as Id<"steps"> });
    } catch (error) {
      console.error("Error toggling failed:", error);
    }
  }, [activeSteps, failedSteps, toggleFailedMutation, applyOptimisticUpdate]);

  const togglePriority = useCallback(async (id: string, currentValue: boolean) => {
    applyOptimisticUpdate(id, { prioritizedToday: !currentValue });
    try {
      await updateStepMutation({
        id: id as Id<"steps">,
        prioritizedToday: !currentValue,
      });
    } catch (error) {
      console.error("Error toggling priority:", error);
    }
  }, [updateStepMutation, applyOptimisticUpdate]);

  const deleteStep = useCallback(async (id: string) => {
    applyOptimisticDelete(id);
    try {
      await deleteStepMutation({ id: id as Id<"steps"> });
    } catch (error) {
      clearOptimisticDelete(id);
      console.error("Error deleting step:", error);
    }
  }, [deleteStepMutation, applyOptimisticDelete, clearOptimisticDelete]);

  const handleReorder = useCallback(async (stepIds: string[], parentId?: string) => {
    try {
      await reorderStepsMutation({
        stepIds: stepIds as Id<"steps">[],
        parentId: parentId as Id<"steps"> | undefined,
      });
    } catch (error) {
      console.error("Error reordering steps:", error);
    }
  }, [reorderStepsMutation]);

  const handleUpdateParent = useCallback(async (stepId: string, newParentId: string | undefined) => {
    try {
      await updateStepParentMutation({
        id: stepId as Id<"steps">,
        parentId: newParentId as Id<"steps"> | undefined,
      });
    } catch (error) {
      console.error("Error updating step parent:", error);
    }
  }, [updateStepParentMutation]);

  const updateStep = useCallback(async (id: string, updates: Partial<Step>) => {
    try {
      const updateData: any = { id: id as Id<"steps"> };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.pathId !== undefined) {
        updateData.pathId = updates.pathId
          ? (typeof updates.pathId === 'string' ? updates.pathId as Id<"paths"> : null)
          : null;
      }
      if (updates.prioritizedToday !== undefined) updateData.prioritizedToday = updates.prioritizedToday;
      if (updates.recurring !== undefined) updateData.recurring = updates.recurring;

      await updateStepMutation(updateData);
    } catch (error) {
      console.error("Error updating step:", error);
    }
  }, [updateStepMutation]);

  const createStep = useCallback(async (
    title: string,
    description?: string,
    pathId?: string
  ) => {
    try {
      await createStepMutation({
        title,
        description: description || "",
        pathId: pathId ? (pathId as Id<"paths">) : undefined,
        prioritizedToday: true,
      });
    } catch (error) {
      console.error("Error creating step:", error);
    }
  }, [createStepMutation]);

  const instantiateRoutine = useCallback(async (routineId: string) => {
    try {
      await executeRoutineMutation({ id: routineId as Id<"routines"> });
    } catch (error) {
      console.error("Error instantiating routine:", error);
    }
  }, [executeRoutineMutation]);

  const handleQuickAdd = useCallback(() => {
    if (quickAddValue.trim()) {
      createStep(quickAddValue.trim(), stepDescValue.trim(), stepPathValue);
      setQuickAddValue("");
      setStepDescValue("");
      setStepPathValue("");
    }
  }, [quickAddValue, stepDescValue, stepPathValue, createStep]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Steps</h1>

      {/* Quick Add */}
      <div className="space-y-2">
        <Input
          placeholder="Step title..."
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleQuickAdd()}
        />
        <Input
          placeholder="Description (optional)..."
          value={stepDescValue}
          onChange={(e) => setStepDescValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleQuickAdd()}
        />
        <div className="flex space-x-2">
          <select
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={stepPathValue}
            onChange={(e) => setStepPathValue(e.target.value)}
          >
            <option value="">No Path</option>
            {paths?.map((path: Path) => (
              <option key={path._id} value={path._id}>
                {path.title}
              </option>
            ))}
          </select>
          <Button onClick={handleQuickAdd} disabled={!quickAddValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search steps..."
            value={searchQuerySteps}
            onChange={(e) => setSearchQuerySteps(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-48"
          value={selectedPathFilterSteps}
          onChange={(e) => setSelectedPathFilterSteps(e.target.value)}
        >
          <option value="">All Paths</option>
          {paths?.map((path: Path) => (
            <option key={path._id} value={path._id}>
              {path.title}
            </option>
          ))}
        </select>
      </div>

      {/* Routine Chips */}
      {routines && routines.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {routines?.map((routine: Routine) => (
              <button
                key={routine._id}
                onClick={() => instantiateRoutine(routine._id)}
                className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all shadow-sm hover:shadow"
              >
                {routine.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Priority Steps */}
      {prioritySteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Star className="w-5 h-5 fill-primary text-primary" />
            <span>Priority</span>
          </h2>
          <DraggableStepList
            steps={prioritySteps}
            paths={memoizedPaths}
            routines={routines}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            onSaveEdit={updateStep}
            onUpdateParent={handleUpdateParent}
          />
        </div>
      )}

      {/* Regular Steps */}
      {regularSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">All Steps</h2>
          <DraggableStepList
            steps={regularSteps}
            paths={memoizedPaths}
            routines={routines}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            onSaveEdit={updateStep}
            onUpdateParent={handleUpdateParent}
          />
        </div>
      )}

      {/* Show Completed/Failed Toggles */}
      <div className="pt-2 flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompletedSteps(!showCompletedSteps)}
          className="flex-1 h-8"
        >
          {showCompletedSteps ? "Hide" : "Show"} Completed ({completedSteps.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFailedSteps(!showFailedSteps)}
          className="flex-1 h-8"
        >
          {showFailedSteps ? "Hide" : "Show"} Failed ({failedStepsList.length})
        </Button>
      </div>

      {/* Failed Steps */}
      {showFailedSteps && failedStepsList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-destructive">
            Failed ({failedStepsList.length})
          </h2>
          <div className="space-y-2">
            {failedStepsList.map((step: Step) => (
              <StepCard
                key={step._id}
                step={step}
                paths={memoizedPaths}
                routines={routines}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Steps */}
      {showCompletedSteps && completedSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-muted-foreground">
            Completed ({completedSteps.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {completedSteps.map((step: Step) => (
              <StepCard
                key={step._id}
                step={step}
                paths={memoizedPaths}
                routines={routines}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
