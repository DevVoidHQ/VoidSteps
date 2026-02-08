import { useState, useCallback, useMemo } from "react";
import type { Step } from "@/types/index";
import {
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useReorderSteps,
  useUpdateStepParent,
  useStartTimer,
  useStopTimer,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { Input, Button } from "@devvoid/ui";
import {
  Star,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  Calendar,
  Timer,
  Square,
} from "lucide-react";
import { useElapsedTime } from "@/hooks/useTimer";
import { StepCard } from "@/components/StepCard";
import { DraggableStepList } from "@/components/DraggableStepList";
import { useStepHierarchy } from "@/hooks/useStepHierarchy";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";

export default function Today() {
  const {
    paths,
    activeSteps,
    completedStepsToday,
    activeTimerStepId,
  } = useData();

  // Mutations
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const reorderStepsMutation = useReorderSteps();
  const updateStepParentMutation = useUpdateStepParent();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();

  // UI state
  const [searchQueryToday, setSearchQueryToday] = useState("");
  const [selectedPathFilterToday, setSelectedPathFilterToday] = useState("");
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());

  // Memoize paths for stable reference
  const memoizedPaths = useMemo(() => paths || [], [paths]);

  // Get hierarchy info for expand all button
  const { rootSteps, hasChildren } = useStepHierarchy(
    useMemo(() => activeSteps?.filter((s: Step) => s.prioritizedToday) || [], [activeSteps])
  );

  // Compute steps with children for expand all logic
  const stepsWithChildren = useMemo(() => {
    return rootSteps.filter((step) => hasChildren(step._id)).map((step) => step._id);
  }, [rootSteps, hasChildren]);

  const allExpanded = useMemo(() => {
    if (stepsWithChildren.length === 0) return false;
    return stepsWithChildren.every((id) => expandedStepIds.has(id));
  }, [stepsWithChildren, expandedStepIds]);

  const toggleAllExpanded = useCallback(() => {
    if (allExpanded) {
      setExpandedStepIds(new Set());
    } else {
      setExpandedStepIds(new Set(stepsWithChildren));
    }
  }, [allExpanded, stepsWithChildren]);

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
  // Separate priority steps with due dates from those without
  const unfilteredDuePrioritySteps = useMemo(
    () => activeSteps?.filter((s: Step) => s.prioritizedToday && s.dueDate !== undefined).sort((a, b) => {
      // Sort by due date (soonest/most overdue first)
      return (a.dueDate ?? 0) - (b.dueDate ?? 0);
    }) || [],
    [activeSteps]
  );

  const unfilteredTodayPrioritySteps = useMemo(
    () => activeSteps?.filter((s: Step) => s.prioritizedToday && !s.dueDate) || [],
    [activeSteps]
  );

  const unfilteredTodayCompletedSteps = useMemo(
    () => completedStepsToday?.filter((s: Step) => s.prioritizedToday) || [],
    [completedStepsToday]
  );

  const duePrioritySteps = useMemo(
    () => filterSteps(unfilteredDuePrioritySteps, searchQueryToday, selectedPathFilterToday),
    [filterSteps, unfilteredDuePrioritySteps, searchQueryToday, selectedPathFilterToday]
  );

  const todayPrioritySteps = useMemo(
    () => filterSteps(unfilteredTodayPrioritySteps, searchQueryToday, selectedPathFilterToday),
    [filterSteps, unfilteredTodayPrioritySteps, searchQueryToday, selectedPathFilterToday]
  );

  const todayCompletedSteps = useMemo(
    () => filterSteps(unfilteredTodayCompletedSteps, searchQueryToday, selectedPathFilterToday),
    [filterSteps, unfilteredTodayCompletedSteps, searchQueryToday, selectedPathFilterToday]
  );

  // Stable callbacks
  const toggleStep = useCallback(async (id: string) => {
    try {
      await toggleStepMutation({ id });
    } catch (error) {
      console.error("Error toggling step:", error);
    }
  }, [toggleStepMutation]);

  const toggleFailed = useCallback(async (id: string) => {
    try {
      await toggleFailedMutation({ id });
    } catch (error) {
      console.error("Error toggling failed:", error);
    }
  }, [toggleFailedMutation]);

  const togglePriority = useCallback(async (id: string, currentValue: boolean) => {
    try {
      await updateStepMutation({
        id,
        prioritizedToday: !currentValue,
      });
    } catch (error) {
      console.error("Error toggling priority:", error);
    }
  }, [updateStepMutation]);

  const deleteStep = useCallback(async (id: string) => {
    try {
      await deleteStepMutation({ id });
    } catch (error) {
      console.error("Error deleting step:", error);
    }
  }, [deleteStepMutation]);

  const handleReorder = useCallback(async (stepIds: string[], parentId?: string) => {
    try {
      await reorderStepsMutation({
        stepIds,
        parentId,
      });
    } catch (error) {
      console.error("Error reordering steps:", error);
    }
  }, [reorderStepsMutation]);

  const handleUpdateParent = useCallback(async (stepId: string, newParentId: string | undefined) => {
    try {
      await updateStepParentMutation({
        id: stepId,
        parentId: newParentId,
      });
    } catch (error) {
      console.error("Error updating step parent:", error);
    }
  }, [updateStepParentMutation]);

  const updateStep = useCallback(async (id: string, updates: Partial<Step>) => {
    try {
      const updateData: any = { id };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.pathId !== undefined) {
        updateData.pathId = updates.pathId
          ? (typeof updates.pathId === 'string' ? updates.pathId : null)
          : null;
      }
      if (updates.prioritizedToday !== undefined) updateData.prioritizedToday = updates.prioritizedToday;
      // Handle dueDate - allow undefined to clear
      if ('dueDate' in updates) {
        updateData.dueDate = updates.dueDate ?? null;
      }
      // Handle startDate - allow undefined to clear
      if ('startDate' in updates) {
        updateData.startDate = updates.startDate ?? null;
      }

      await updateStepMutation(updateData);
    } catch (error) {
      console.error("Error updating step:", error);
    }
  }, [updateStepMutation]);

  // Find the step with active timer for the banner
  const activeTimerStep = useMemo(() => {
    if (!activeTimerStepId) return null;
    return activeSteps?.find(s => s._id === activeTimerStepId) ||
           completedStepsToday?.find(s => s._id === activeTimerStepId) ||
           null;
  }, [activeTimerStepId, activeSteps, completedStepsToday]);

  const globalTimerElapsed = useElapsedTime(
    activeTimerStep?.timerStartedAt,
    activeTimerStep?.totalTimeSpentMs || 0
  );

  // Timer callback - handles start/stop and switching between steps
  const toggleTimer = useCallback(async (id: string) => {
    try {
      // If clicking on the currently active timer, stop it
      if (activeTimerStepId === id) {
        await stopTimerMutation({ id });
      } else {
        // If there's a different timer running, stop it first
        if (activeTimerStepId) {
          await stopTimerMutation({ id: activeTimerStepId });
        }
        // Start the new timer
        await startTimerMutation({ id });
      }
    } catch (error) {
      console.error("Error toggling timer:", error);
    }
  }, [activeTimerStepId, startTimerMutation, stopTimerMutation]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Today's Focus</h1>
        {activeTimerStep && (
          <button
            onClick={() => toggleTimer(activeTimerStep._id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-foreground font-medium truncate max-w-[150px]">{activeTimerStep.title}</span>
            <span className="font-mono text-primary">{globalTimerElapsed}</span>
            <Square className="w-3 h-3 fill-current" />
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search steps..."
            value={searchQueryToday}
            onChange={(e) => setSearchQueryToday(e.target.value)}
            className="pl-9"
          />
        </div>
        <HierarchicalPathSelector
          paths={paths || []}
          selectedPathId={selectedPathFilterToday || null}
          onChange={(id) => setSelectedPathFilterToday(id || "")}
          placeholder="All Paths"
          allowEmpty={true}
          className="sm:w-48"
        />
        {/* Expand All button */}
        {stepsWithChildren.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllExpanded}
            className="h-10 w-10 p-0"
            title={allExpanded ? "Collapse All" : "Expand All"}
          >
            {allExpanded ? (
              <ChevronsDownUp className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Due Priority Steps - Pinned at top */}
      {duePrioritySteps.length > 0 && (
        <div className="space-y-3 p-4 -mx-4 bg-primary/5 border-y border-primary/20">
          <h2 className="text-lg font-semibold flex items-center space-x-2 text-primary">
            <Calendar className="w-5 h-5" />
            <span>Due ({duePrioritySteps.length})</span>
          </h2>
          <div className="space-y-2">
            {duePrioritySteps.map((step: Step) => (
              <StepCard
                key={step._id}
                step={step}
                paths={memoizedPaths}
                routines={undefined}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
                onToggleTimer={toggleTimer}
                activeTimerStepId={activeTimerStepId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Priority Steps */}
      {todayPrioritySteps.length > 0 ? (
        <DraggableStepList
          steps={todayPrioritySteps}
          paths={memoizedPaths}
          routines={undefined}
          onReorder={handleReorder}
          onToggle={toggleStep}
          onToggleFailed={toggleFailed}
          onDelete={deleteStep}
          onTogglePriority={togglePriority}
          onSaveEdit={updateStep}
          onUpdateParent={handleUpdateParent}
          expandedStepIds={expandedStepIds}
          onExpandedChange={setExpandedStepIds}
          hideExpandAllButton
          onToggleTimer={toggleTimer}
          activeTimerStepId={activeTimerStepId}
        />
      ) : duePrioritySteps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>
            {searchQueryToday || selectedPathFilterToday
              ? "No steps match your search"
              : "No steps prioritized for today"}
          </p>
          {!searchQueryToday && !selectedPathFilterToday && (
            <p className="text-sm mt-1">Star a step to add it here</p>
          )}
        </div>
      ) : null}

      {/* Completed Today */}
      {todayCompletedSteps.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground">
            Completed Today ({todayCompletedSteps.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {todayCompletedSteps.map((step: Step) => (
              <StepCard
                key={step._id}
                step={step}
                paths={memoizedPaths}
                routines={undefined}
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
