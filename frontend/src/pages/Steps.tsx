import { useState } from "react";
import type { Step, Path, Routine } from "@/types/index";
import {
  useSteps,
  useActiveSteps,
  useFailedSteps,
  usePaths,
  useRoutines,
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useExecuteRoutine,
  useReorderSteps,
} from "@/lib/convex-hooks";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Star,
  Search,
} from "lucide-react";
import { StepCard } from "@/components/StepCard";
import { DraggableStepList } from "@/components/DraggableStepList";

export default function Steps() {
  const activeSteps = useActiveSteps();
  const allSteps = useSteps();
  const failedSteps = useFailedSteps();
  const paths = usePaths();
  const routines = useRoutines();

  const createStepMutation = useCreateStep();
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const executeRoutineMutation = useExecuteRoutine();
  const reorderStepsMutation = useReorderSteps();

  const [quickAddValue, setQuickAddValue] = useState("");
  const [stepDescValue, setStepDescValue] = useState("");
  const [stepPathValue, setStepPathValue] = useState("");
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepForm, setEditStepForm] = useState({
    title: "",
    description: "",
    pathId: "",
  });
  const [showCompletedSteps, setShowCompletedSteps] = useState(false);
  const [showFailedSteps, setShowFailedSteps] = useState(false);
  const [searchQuerySteps, setSearchQuerySteps] = useState("");
  const [selectedPathFilterSteps, setSelectedPathFilterSteps] = useState("");

  const isLoading = activeSteps === undefined || paths === undefined || routines === undefined;

  const createStep = async (
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
  };

  const updateStep = async (id: string, updates: Partial<Step>) => {
    try {
      const updateData: any = { id: id as Id<"steps"> };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.pathId !== undefined) {
        updateData.pathId = updates.pathId ? (typeof updates.pathId === 'string' ? updates.pathId as Id<"paths"> : null) : null;
      }
      if (updates.prioritizedToday !== undefined) updateData.prioritizedToday = updates.prioritizedToday;
      if (updates.recurring !== undefined) updateData.recurring = updates.recurring;

      await updateStepMutation(updateData);
      setEditingStep(null);
    } catch (error) {
      console.error("Error updating step:", error);
    }
  };

  const startEditStep = (step: Step) => {
    setEditingStep(step._id);
    setEditStepForm({
      title: step.title,
      description: step.description || "",
      pathId:
        typeof step.pathId === "object" && step.pathId
          ? step.pathId._id
          : (step.pathId as unknown as string) || "",
    });
  };

  const cancelEditStep = () => {
    setEditingStep(null);
    setEditStepForm({ title: "", description: "", pathId: "" });
  };

  const toggleStep = async (id: string) => {
    await toggleStepMutation({ id: id as Id<"steps"> });
  };

  const toggleFailed = async (id: string) => {
    await toggleFailedMutation({ id: id as Id<"steps"> });
  };

  const togglePriority = async (id: string, currentValue: boolean) => {
    await updateStepMutation({
      id: id as Id<"steps">,
      prioritizedToday: !currentValue
    });
  };

  const deleteStep = async (id: string) => {
    await deleteStepMutation({ id: id as Id<"steps"> });
  };

  const handleReorder = async (stepIds: string[]) => {
    await reorderStepsMutation({ stepIds: stepIds as Id<"steps">[] });
  };

  const instantiateRoutine = async (routineId: string) => {
    try {
      await executeRoutineMutation({ id: routineId as Id<"routines"> });
    } catch (error) {
      console.error("Error instantiating routine:", error);
    }
  };

  const filterSteps = (steps: Step[], searchQuery: string, pathFilter: string): Step[] => {
    return steps.filter((step: Step) => {
      const matchesSearch = !searchQuery ||
        step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (step.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const stepPathId = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null);
      const matchesPath = !pathFilter || stepPathId === pathFilter;

      return matchesSearch && matchesPath;
    });
  };

  const handleQuickAdd = () => {
    if (quickAddValue.trim()) {
      createStep(quickAddValue.trim(), stepDescValue.trim(), stepPathValue);
      setQuickAddValue("");
      setStepDescValue("");
      setStepPathValue("");
    }
  };

  const steps = activeSteps;
  const unfilteredPrioritySteps = steps?.filter((s: Step) => s.prioritizedToday) || [];
  const unfilteredRegularSteps = steps?.filter((s: Step) => !s.prioritizedToday) || [];
  const unfilteredCompletedSteps = showCompletedSteps ? (allSteps?.filter((s: Step) => s.completed) || []) : [];
  const unfilteredFailedStepsList = showFailedSteps ? (failedSteps || []) : [];

  const prioritySteps = filterSteps(unfilteredPrioritySteps, searchQuerySteps, selectedPathFilterSteps);
  const regularSteps = filterSteps(unfilteredRegularSteps, searchQuerySteps, selectedPathFilterSteps);
  const completedSteps = filterSteps(unfilteredCompletedSteps, searchQuerySteps, selectedPathFilterSteps);
  const failedStepsList = filterSteps(unfilteredFailedStepsList, searchQuerySteps, selectedPathFilterSteps);

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
      {isLoading ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 w-24 rounded-md bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : routines && routines.length > 0 ? (
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
            paths={paths || []}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            editingStep={editingStep}
            editForm={editStepForm}
            onStartEdit={startEditStep}
            onCancelEdit={cancelEditStep}
            onSaveEdit={updateStep}
            onEditFormChange={(updates) =>
              setEditStepForm({ ...editStepForm, ...updates })
            }
          />
        </div>
      )}

      {/* Regular Steps */}
      {regularSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">All Steps</h2>
          <DraggableStepList
            steps={regularSteps}
            paths={paths || []}
            onReorder={handleReorder}
            onToggle={toggleStep}
            onToggleFailed={toggleFailed}
            onDelete={deleteStep}
            onTogglePriority={togglePriority}
            editingStep={editingStep}
            editForm={editStepForm}
            onStartEdit={startEditStep}
            onCancelEdit={cancelEditStep}
            onSaveEdit={updateStep}
            onEditFormChange={(updates) =>
              setEditStepForm({ ...editStepForm, ...updates })
            }
          />
        </div>
      )}

      {/* Show Completed/Failed Toggles */}
      <div className="pt-2 flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompletedSteps(!showCompletedSteps)}
          className="flex-1"
        >
          {showCompletedSteps ? "Hide" : "Show"} Completed
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFailedSteps(!showFailedSteps)}
          className="flex-1"
        >
          {showFailedSteps ? "Hide" : "Show"} Failed
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
                paths={paths || []}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                isEditing={editingStep === step._id}
                editForm={editStepForm}
                onStartEdit={startEditStep}
                onCancelEdit={cancelEditStep}
                onSaveEdit={updateStep}
                onEditFormChange={(updates) =>
                  setEditStepForm({ ...editStepForm, ...updates })
                }
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
                paths={paths || []}
                onToggle={toggleStep}
                onToggleFailed={toggleFailed}
                onDelete={deleteStep}
                onTogglePriority={togglePriority}
                isEditing={editingStep === step._id}
                editForm={editStepForm}
                onStartEdit={startEditStep}
                onCancelEdit={cancelEditStep}
                onSaveEdit={updateStep}
                onEditFormChange={(updates) =>
                  setEditStepForm({ ...editStepForm, ...updates })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
