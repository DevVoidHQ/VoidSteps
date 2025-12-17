import { useState } from "react";
import type { Step, Path } from "@/types/index";
import {
  useActiveSteps,
  useCompletedStepsToday,
  usePaths,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
} from "@/lib/convex-hooks";
import type { Id } from "../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
} from "lucide-react";
import { StepCard } from "@/components/StepCard";

export default function Today() {
  const activeSteps = useActiveSteps();
  const completedStepsToday = useCompletedStepsToday();
  const paths = usePaths();

  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();

  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepForm, setEditStepForm] = useState({
    title: "",
    description: "",
    pathId: "",
  });
  const [searchQueryToday, setSearchQueryToday] = useState("");
  const [selectedPathFilterToday, setSelectedPathFilterToday] = useState("");

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

  const unfilteredTodayPrioritySteps = activeSteps?.filter((s: Step) => s.prioritizedToday) || [];
  const unfilteredTodayCompletedSteps = completedStepsToday?.filter((s: Step) => s.prioritizedToday) || [];

  const todayPrioritySteps = filterSteps(unfilteredTodayPrioritySteps, searchQueryToday, selectedPathFilterToday);
  const todayCompletedSteps = filterSteps(unfilteredTodayCompletedSteps, searchQueryToday, selectedPathFilterToday);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Today's Focus</h1>

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
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-48"
          value={selectedPathFilterToday}
          onChange={(e) => setSelectedPathFilterToday(e.target.value)}
        >
          <option value="">All Paths</option>
          {paths?.map((path: Path) => (
            <option key={path._id} value={path._id}>
              {path.title}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Steps */}
      {todayPrioritySteps.length > 0 ? (
        <div className="space-y-2">
          {todayPrioritySteps.map((step: Step) => (
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
      ) : (
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
      )}

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
