import { useState, useCallback, useMemo } from "react";
import type { Step } from "@/types/index";
import {
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useReorderSteps,
  useUpdateStepParent,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { Button, Input } from "@devvoid/ui";
import {
  Plus,
  Star,
  Search,
  Calendar,
  Clock,
} from "lucide-react";
import { parseDateInput, parseStartDateInput } from "@/lib/date-utils";
import { StepCard } from "@/components/StepCard";
import { DraggableStepList } from "@/components/DraggableStepList";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";

export default function Steps() {
  const {
    activePaths,
    activeSteps,
    allSteps,
    failedSteps,
    upcomingSteps,
  } = useData();

  // Mutations
  const createStepMutation = useCreateStep();
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const reorderStepsMutation = useReorderSteps();
  const updateStepParentMutation = useUpdateStepParent();

  // Form state for quick add
  const [quickAddValue, setQuickAddValue] = useState("");
  const [stepDescValue, setStepDescValue] = useState("");
  const [stepPathValue, setStepPathValue] = useState("");
  const [stepDueDateValue, setStepDueDateValue] = useState("");
  const [stepStartDateValue, setStepStartDateValue] = useState("");

  // UI state
  const [showCompletedSteps, setShowCompletedSteps] = useState(false);
  const [showFailedSteps, setShowFailedSteps] = useState(false);
  const [showUpcomingSteps, setShowUpcomingSteps] = useState(true);
  const [searchQuerySteps, setSearchQuerySteps] = useState("");
  const [selectedPathFilterSteps, setSelectedPathFilterSteps] = useState("");

  // Memoize paths for stable reference
  const memoizedPaths = useMemo(() => activePaths || [], [activePaths]);

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
  // Separate steps with due dates from active steps (shown at top)
  const unfilteredDueSteps = useMemo(
    () => activeSteps?.filter((s: Step) => s.dueDate !== undefined).sort((a, b) => {
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

  const unfilteredUpcomingSteps = useMemo(
    () => upcomingSteps || [],
    [upcomingSteps]
  );

  const unfilteredCompletedSteps = useMemo(
    () => allSteps?.filter((s: Step) => s.completed) || [],
    [allSteps]
  );

  const unfilteredFailedStepsList = useMemo(
    () => failedSteps || [],
    [failedSteps]
  );

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

  const createStep = useCallback(async (
    title: string,
    description?: string,
    pathId?: string,
    dueDate?: number,
    startDate?: number
  ) => {
    try {
      await createStepMutation({
        title,
        description: description || "",
        pathId: pathId || undefined,
        prioritizedToday: true,
        dueDate,
        startDate,
      });
    } catch (error) {
      console.error("Error creating step:", error);
    }
  }, [createStepMutation]);

  const handleQuickAdd = useCallback(() => {
    if (quickAddValue.trim()) {
      createStep(
        quickAddValue.trim(),
        stepDescValue.trim(),
        stepPathValue,
        parseDateInput(stepDueDateValue),
        parseStartDateInput(stepStartDateValue)
      );
      setQuickAddValue("");
      setStepDescValue("");
      setStepPathValue("");
      setStepDueDateValue("");
      setStepStartDateValue("");
    }
  }, [quickAddValue, stepDescValue, stepPathValue, stepDueDateValue, stepStartDateValue, createStep]);

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
          <HierarchicalPathSelector
            paths={activePaths || []}
            selectedPathId={stepPathValue || null}
            onChange={(id) => setStepPathValue(id || "")}
            placeholder="No Path"
            allowEmpty={true}
            className="flex-1"
          />
          <Button onClick={handleQuickAdd} disabled={!quickAddValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Due Date (optional)</label>
            <input
              type="date"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] cursor-pointer"
              value={stepDueDateValue}
              onChange={(e) => setStepDueDateValue(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Start Date (optional)</label>
            <input
              type="date"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] cursor-pointer"
              value={stepStartDateValue}
              onChange={(e) => setStepStartDateValue(e.target.value)}
            />
          </div>
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
        <HierarchicalPathSelector
          paths={activePaths || []}
          selectedPathId={selectedPathFilterSteps || null}
          onChange={(id) => setSelectedPathFilterSteps(id || "")}
          placeholder="All Paths"
          allowEmpty={true}
          className="sm:w-48"
        />
      </div>

      {/* Due Steps - Pinned at top */}
      {dueSteps.length > 0 && (
        <div className="space-y-3 p-4 -mx-4 bg-primary/5 border-y border-primary/20">
          <h2 className="text-lg font-semibold flex items-center space-x-2 text-primary">
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
            routines={undefined}
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
