import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";

// Sort for Today's list. "My order" is the drag order; the others are views
// and leave that order alone.
const TODAY_SORT_KEY = "voidsteps-today-sort";
import type { Step } from "@/types/index";
import {
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useReorderSteps,
  useStartTimer,
  useStopTimer,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { useLensedData } from "@/contexts/LensContext";
import { Select } from "@/components/ui/Select";
import { sortSteps, STEP_SORTS, type StepSort } from "@/lib/step-sort";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Input } from "@/components/ui/Input";
import { Star, Search } from "lucide-react";
import { StepCard } from "@/components/StepCard";
import { filterSteps as applyStepFilters } from "@/lib/step-filters";
import { DraggableStepList } from "@/components/DraggableStepList";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TodayView() {
  const toast = useToast();
  // Steps come through the lens; paths stay whole so cards can show any path.
  const { activePaths } = useData();
  const { activeSteps, completedStepsToday, runningTimerStepIds } = useLensedData();

  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const reorderStepsMutation = useReorderSteps();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();

  const [searchQueryToday, setSearchQueryToday] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef);
  const [sort, setSort] = useState<StepSort>(() => {
    try {
      const v = localStorage.getItem(TODAY_SORT_KEY) as StepSort | null;
      return v && STEP_SORTS.some((s) => s.value === v) ? v : "manual";
    } catch {
      return "manual";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(TODAY_SORT_KEY, sort);
    } catch {
      /* ignore */
    }
  }, [sort]);

  const memoizedPaths = useMemo(() => activePaths || [], [activePaths]);

  // One list: every starred step, due or not. activeSteps arrive in drag order.
  const todaySteps = useMemo(
    () =>
      sortSteps(
        applyStepFilters(
          activeSteps?.filter((s: Step) => s.prioritizedToday) ?? [],
          searchQueryToday,
          "",
          new Set()
        ),
        sort,
        memoizedPaths
      ),
    [activeSteps, searchQueryToday, sort, memoizedPaths]
  );

  const todayCompletedSteps = useMemo(
    () =>
      applyStepFilters(
        completedStepsToday?.filter((s: Step) => s.prioritizedToday) ?? [],
        searchQueryToday,
        "",
        new Set()
      ),
    [completedStepsToday, searchQueryToday]
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
        <Select
          className="sm:w-44"
          triggerClassName="h-11"
          value={sort}
          onValueChange={(v) => setSort(v as StepSort)}
          options={STEP_SORTS}
        />
      </div>

      {todaySteps.length === 0 ? (
        <EmptyState
          icon={searchQueryToday ? Search : Star}
          message={
            searchQueryToday ? "No steps match your search" : "No steps prioritized for today"
          }
          hint={!searchQueryToday ? "Star a step to add it here" : undefined}
        />
      ) : sort === "manual" ? (
        <DraggableStepList
          steps={todaySteps}
          paths={memoizedPaths}
          onReorder={handleReorder}
          onToggle={toggleStep}
          onToggleFailed={toggleFailed}
          onDelete={deleteStep}
          onTogglePriority={togglePriority}
          onSaveEdit={updateStep}
          onToggleTimer={toggleTimer}
        />
      ) : (
        // A sorted view: dragging would fight the sort, so it is a plain list.
        <div className="space-y-2">
          {todaySteps.map((step: Step) => (
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
            />
          ))}
        </div>
      )}

      {/* Completed Today */}
      {todayCompletedSteps.length > 0 && (
        <div className="space-y-3 pt-6">
          <h2 className="type-label text-muted-foreground">
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
