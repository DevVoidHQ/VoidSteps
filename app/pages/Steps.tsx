import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Step } from "@/types/index";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { useStepsClickAction } from "@/lib/preferences";

// Shared with the Today view so the path filter stays in sync across both.
const STEPS_PATH_FILTER_KEY = "voidsteps-path-filter";
import {
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useReorderSteps,
  useStartTimer,
  useStopTimer,
  useSetTotalTime,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { getDescendantPathIds } from "@/lib/path-utils";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Star, Search, Calendar, Clock, CheckCircle2 } from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import { getKeybinds, formatKeybindDisplay } from "@/lib/keybind-config";
import { StepCard } from "@/components/StepCard";
import { filterSteps as applyStepFilters } from "@/lib/step-filters";
import { DraggableStepList } from "@/components/DraggableStepList";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Steps() {
  const toast = useToast();
  const { activePaths, activeSteps, allSteps, failedSteps, upcomingSteps, runningTimerStepIds } =
    useData();

  // Mutations
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const reorderStepsMutation = useReorderSteps();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const setTotalTimeMutation = useSetTotalTime();

  const toggleTimer = useCallback(
    async (id: string) => {
      try {
        // Timers run in parallel, so this only ever touches the step you
        // clicked: no other running timer is stopped on its behalf.
        if (runningTimerStepIds.includes(id)) {
          await stopTimerMutation({ id });
        } else {
          await startTimerMutation({ id });
        }
      } catch (error) {
        reportError("mutation", error, { action: "toggleTimer", stepId: id });
        toast.error("Failed to toggle timer");
      }
    },
    [runningTimerStepIds, startTimerMutation, stopTimerMutation, toast]
  );

  const setTotalTime = useCallback(
    async (id: string, totalTimeMs: number) => {
      try {
        await setTotalTimeMutation({ id, totalTimeSpentMs: totalTimeMs });
      } catch (error) {
        reportError("mutation", error, { action: "setTotalTime", stepId: id });
        toast.error("Failed to set time");
      }
    },
    [setTotalTimeMutation, toast]
  );

  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showCompletedSteps, setShowCompletedSteps] = useState(false);
  const [showFailedSteps, setShowFailedSteps] = useState(false);
  const [showUpcomingSteps, setShowUpcomingSteps] = useState(true);
  const [searchQuerySteps, setSearchQuerySteps] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef);
  const stepsClickAction = useStepsClickAction();
  const [selectedPathFilterSteps, setSelectedPathFilterSteps] = useState<string>(() => {
    try {
      return localStorage.getItem(STEPS_PATH_FILTER_KEY) || "";
    } catch {
      return "";
    }
  });

  // Persist the path filter so it stays locked in until changed/cleared.
  useEffect(() => {
    try {
      if (selectedPathFilterSteps)
        localStorage.setItem(STEPS_PATH_FILTER_KEY, selectedPathFilterSteps);
      else localStorage.removeItem(STEPS_PATH_FILTER_KEY);
    } catch {
      /* ignore */
    }
  }, [selectedPathFilterSteps]);

  // Memoize paths for stable reference
  const memoizedPaths = useMemo(() => activePaths || [], [activePaths]);

  // Drop a stale filter if its path no longer exists (e.g. deleted).
  useEffect(() => {
    if (
      selectedPathFilterSteps &&
      memoizedPaths.length > 0 &&
      !memoizedPaths.some((p) => p._id === selectedPathFilterSteps)
    ) {
      setSelectedPathFilterSteps("");
    }
  }, [selectedPathFilterSteps, memoizedPaths]);

  const descendantPathIds = useMemo(
    () => getDescendantPathIds(selectedPathFilterSteps, memoizedPaths),
    [selectedPathFilterSteps, memoizedPaths]
  );

  const filterSteps = useCallback(
    (steps: Step[], searchQuery: string, pathFilter: string) =>
      applyStepFilters(steps, searchQuery, pathFilter, descendantPathIds),
    [descendantPathIds]
  );

  // Memoized filtered arrays
  // Separate steps with due dates from active steps (shown at top)
  const unfilteredDueSteps = useMemo(
    () =>
      activeSteps
        ?.filter((s: Step) => s.dueDate !== undefined)
        .sort((a, b) => {
          // Sort by due date (soonest/most overdue first)
          return (a.dueDate ?? 0) - (b.dueDate ?? 0);
        }) || [],
    [activeSteps]
  );

  const unfilteredPrioritySteps = useMemo(
    () => activeSteps?.filter((s: Step) => s.prioritizedToday && !s.dueDate) || [],
    [activeSteps]
  );

  const unfilteredRegularSteps = useMemo(
    () => activeSteps?.filter((s: Step) => !s.prioritizedToday && !s.dueDate) || [],
    [activeSteps]
  );

  const unfilteredUpcomingSteps = useMemo(() => upcomingSteps || [], [upcomingSteps]);

  const unfilteredCompletedSteps = useMemo(
    () => allSteps?.filter((s: Step) => s.completed) || [],
    [allSteps]
  );

  const unfilteredFailedStepsList = useMemo(() => failedSteps || [], [failedSteps]);

  const dueSteps = useMemo(
    () => filterSteps(unfilteredDueSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredDueSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const prioritySteps = useMemo(
    () => filterSteps(unfilteredPrioritySteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredPrioritySteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const regularSteps = useMemo(
    () => filterSteps(unfilteredRegularSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredRegularSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const filteredUpcomingSteps = useMemo(
    () => filterSteps(unfilteredUpcomingSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredUpcomingSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const completedSteps = useMemo(
    () => filterSteps(unfilteredCompletedSteps, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredCompletedSteps, searchQuerySteps, selectedPathFilterSteps]
  );

  const failedStepsList = useMemo(
    () => filterSteps(unfilteredFailedStepsList, searchQuerySteps, selectedPathFilterSteps),
    [filterSteps, unfilteredFailedStepsList, searchQuerySteps, selectedPathFilterSteps]
  );

  // Stable callbacks
  const toggleStep = useCallback(
    async (id: string) => {
      try {
        await toggleStepMutation({ id });
      } catch (error) {
        reportError("mutation", error, { action: "toggleStep", stepId: id });
        toast.error("Failed to toggle step");
      }
    },
    [toggleStepMutation, toast]
  );

  const toggleFailed = useCallback(
    async (id: string) => {
      try {
        await toggleFailedMutation({ id });
      } catch (error) {
        reportError("mutation", error, { action: "toggleFailed", stepId: id });
        toast.error("Failed to update step");
      }
    },
    [toggleFailedMutation, toast]
  );

  const togglePriority = useCallback(
    async (id: string, currentValue: boolean) => {
      try {
        await updateStepMutation({
          id,
          prioritizedToday: !currentValue,
        });
      } catch (error) {
        reportError("mutation", error, { action: "togglePriority", stepId: id });
        toast.error("Failed to update priority");
      }
    },
    [updateStepMutation, toast]
  );

  const deleteStep = useCallback(
    async (id: string) => {
      try {
        await deleteStepMutation({ id });
      } catch (error) {
        reportError("mutation", error, { action: "deleteStep", stepId: id });
        toast.error("Failed to delete step");
      }
    },
    [deleteStepMutation, toast]
  );

  const handleReorder = useCallback(
    async (stepIds: string[]) => {
      try {
        await reorderStepsMutation({ stepIds });
      } catch (error) {
        reportError("mutation", error, { action: "reorderSteps" });
        toast.error("Failed to reorder steps");
      }
    },
    [reorderStepsMutation, toast]
  );

  const updateStep = useCallback(
    async (id: string, updates: Partial<Step>) => {
      try {
        const updateData: any = { id };
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.completed !== undefined) updateData.completed = updates.completed;
        if (updates.pathId !== undefined) {
          updateData.pathId = updates.pathId
            ? typeof updates.pathId === "string"
              ? updates.pathId
              : null
            : null;
        }
        if (updates.prioritizedToday !== undefined)
          updateData.prioritizedToday = updates.prioritizedToday;
        // Handle dueDate - allow undefined to clear
        if ("dueDate" in updates) {
          updateData.dueDate = updates.dueDate ?? null;
        }
        // Handle startDate - allow undefined to clear
        if ("startDate" in updates) {
          updateData.startDate = updates.startDate ?? null;
        }

        await updateStepMutation(updateData);
      } catch (error) {
        reportError("mutation", error, { action: "updateStep", stepId: id });
        toast.error("Failed to update step");
      }
    },
    [updateStepMutation, toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">All steps</h1>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Step
          <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 font-mono text-[10px]">
            {formatKeybindDisplay(getKeybinds().quickCreate)}
          </kbd>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search steps..."
            value={searchQuerySteps}
            onChange={(e) => setSearchQuerySteps(e.target.value)}
            className="pl-9"
          />
        </div>
        <HierarchicalPathSelector
          paths={activePaths || []}
          selectedPathId={selectedPathFilterSteps || null}
          onChange={(id) => setSelectedPathFilterSteps(id || "")}
          placeholder="All paths"
          allowEmpty={true}
          className="sm:w-48"
        />
      </div>

      {/* Due Steps - Pinned at top */}
      {dueSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center space-x-2 text-accent">
            <Calendar className="w-5 h-5" />
            <span>Due ({dueSteps.length})</span>
          </h2>
          <div className="space-y-2">
            {dueSteps.map((step: Step) => (
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
                onSetTotalTime={setTotalTime}
                clickAction={stepsClickAction}
              />
            ))}
          </div>
        </div>
      )}

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
            routines={undefined}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            onSaveEdit={updateStep}
            onToggleTimer={toggleTimer}
            onSetTotalTime={setTotalTime}
            clickAction={stepsClickAction}
          />
        </div>
      )}

      {/* Regular Steps */}
      {regularSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">All steps</h2>
          <DraggableStepList
            steps={regularSteps}
            paths={memoizedPaths}
            routines={undefined}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            onSaveEdit={updateStep}
            onToggleTimer={toggleTimer}
            onSetTotalTime={setTotalTime}
            clickAction={stepsClickAction}
          />
        </div>
      )}

      {/* Empty State */}
      {dueSteps.length === 0 &&
        prioritySteps.length === 0 &&
        regularSteps.length === 0 &&
        filteredUpcomingSteps.length === 0 && (
          <EmptyState
            icon={searchQuerySteps || selectedPathFilterSteps ? Search : CheckCircle2}
            message={
              searchQuerySteps || selectedPathFilterSteps
                ? "No steps match your filters"
                : "No active steps"
            }
            hint={
              searchQuerySteps || selectedPathFilterSteps
                ? "Try adjusting your search or path filter"
                : "Add a step above to get started"
            }
          />
        )}

      {/* Upcoming Steps - At bottom with muted styling */}
      {filteredUpcomingSteps.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <button
            onClick={() => setShowUpcomingSteps(!showUpcomingSteps)}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="w-5 h-5" />
            <span className="text-lg font-semibold">Upcoming ({filteredUpcomingSteps.length})</span>
            <span className="text-sm">({showUpcomingSteps ? "hide" : "show"})</span>
          </button>
          {showUpcomingSteps && (
            <div className="space-y-2 opacity-70">
              {filteredUpcomingSteps.map((step: Step) => (
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
                  onSetTotalTime={setTotalTime}
                  clickAction={stepsClickAction}
                  showStartDateBadge
                />
              ))}
            </div>
          )}
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
                routines={undefined}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
                onToggleTimer={toggleTimer}
                onSetTotalTime={setTotalTime}
                clickAction={stepsClickAction}
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
                routines={undefined}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
                onToggleTimer={toggleTimer}
                onSetTotalTime={setTotalTime}
                clickAction={stepsClickAction}
              />
            ))}
          </div>
        </div>
      )}

      <QuickCapture open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
