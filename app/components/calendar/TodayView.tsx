import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { useTodayClickAction } from "@/lib/preferences";

// Shared with the Steps page so the path filter stays in sync across both.
const TODAY_PATH_FILTER_KEY = "voidsteps-path-filter";
import type { Step } from "@/types/index";
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
import { Input } from "@/components/ui/Input";
import { Star, Search, Calendar } from "lucide-react";
import { StepCard } from "@/components/StepCard";
import { filterSteps as applyStepFilters } from "@/lib/step-filters";
import { DraggableStepList } from "@/components/DraggableStepList";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TodayView() {
  const toast = useToast();
  const { activePaths, activeSteps, completedStepsToday, runningTimerStepIds } = useData();

  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const reorderStepsMutation = useReorderSteps();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const setTotalTimeMutation = useSetTotalTime();

  const [searchQueryToday, setSearchQueryToday] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef);
  const todayClickAction = useTodayClickAction();
  const [selectedPathFilterToday, setSelectedPathFilterToday] = useState<string>(() => {
    try {
      return localStorage.getItem(TODAY_PATH_FILTER_KEY) || "";
    } catch {
      return "";
    }
  });

  // Persist the path filter so it stays locked in until changed/cleared.
  useEffect(() => {
    try {
      if (selectedPathFilterToday)
        localStorage.setItem(TODAY_PATH_FILTER_KEY, selectedPathFilterToday);
      else localStorage.removeItem(TODAY_PATH_FILTER_KEY);
    } catch {
      /* ignore */
    }
  }, [selectedPathFilterToday]);

  const memoizedPaths = useMemo(() => activePaths || [], [activePaths]);

  // Drop a stale filter if its path no longer exists (e.g. deleted).
  useEffect(() => {
    if (
      selectedPathFilterToday &&
      memoizedPaths.length > 0 &&
      !memoizedPaths.some((p) => p._id === selectedPathFilterToday)
    ) {
      setSelectedPathFilterToday("");
    }
  }, [selectedPathFilterToday, memoizedPaths]);

  const descendantPathIds = useMemo(
    () => getDescendantPathIds(selectedPathFilterToday, memoizedPaths),
    [selectedPathFilterToday, memoizedPaths]
  );

  const filterSteps = useCallback(
    (steps: Step[], searchQuery: string, pathFilter: string) =>
      applyStepFilters(steps, searchQuery, pathFilter, descendantPathIds),
    [descendantPathIds]
  );

  const unfilteredDuePrioritySteps = useMemo(
    () =>
      activeSteps
        ?.filter((s: Step) => s.prioritizedToday && s.dueDate !== undefined)
        .sort((a, b) => {
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
        await updateStepMutation({ id, prioritizedToday: !currentValue });
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
        if ("dueDate" in updates) updateData.dueDate = updates.dueDate ?? null;
        if ("startDate" in updates) updateData.startDate = updates.startDate ?? null;
        await updateStepMutation(updateData);
      } catch (error) {
        reportError("mutation", error, { action: "updateStep", stepId: id });
        toast.error("Failed to update step");
      }
    },
    [updateStepMutation, toast]
  );

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

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search steps..."
            value={searchQueryToday}
            onChange={(e) => setSearchQueryToday(e.target.value)}
            className="pl-9"
          />
        </div>
        <HierarchicalPathSelector
          paths={activePaths || []}
          selectedPathId={selectedPathFilterToday || null}
          onChange={(id) => setSelectedPathFilterToday(id || "")}
          placeholder="All paths"
          allowEmpty={true}
          className="sm:w-48"
        />
      </div>

      {/* Due Priority Steps */}
      {duePrioritySteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center space-x-2 text-accent">
            <Calendar className="w-5 h-5" />
            <span>Due ({duePrioritySteps.length})</span>
          </h2>
          <div className="space-y-2">
            {duePrioritySteps.map((step: Step) => (
              <StepCard
                key={step._id}
                step={step}
                paths={memoizedPaths}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                onSaveEdit={updateStep}
                onToggleTimer={toggleTimer}
                onSetTotalTime={setTotalTime}
                clickAction={todayClickAction}
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
          onReorder={handleReorder}
          onToggle={toggleStep}
          onToggleFailed={toggleFailed}
          onDelete={deleteStep}
          onTogglePriority={togglePriority}
          onSaveEdit={updateStep}
          onToggleTimer={toggleTimer}
          onSetTotalTime={setTotalTime}
          clickAction={todayClickAction}
        />
      ) : duePrioritySteps.length === 0 ? (
        <EmptyState
          icon={searchQueryToday || selectedPathFilterToday ? Search : Star}
          message={
            searchQueryToday || selectedPathFilterToday
              ? "No steps match your search"
              : "No steps prioritized for today"
          }
          hint={
            !searchQueryToday && !selectedPathFilterToday ? "Star a step to add it here" : undefined
          }
        />
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
