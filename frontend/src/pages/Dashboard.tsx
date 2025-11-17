import { useState } from "react";
import type { Step, Path, Routine, StepTemplate } from "@/types/index";
import {
  useSteps,
  usePaths,
  useRoutines,
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useCreatePath,
  useUpdatePath,
  useDeletePath,
  useCreateRoutine,
  useUpdateRoutine,
  useDeleteRoutine,
  useExecuteRoutine,
} from "@/lib/convex-hooks";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Repeat,
  Star,
  Target,
  Pencil,
  Zap,
} from "lucide-react";

type TabType = "today" | "steps" | "paths" | "routines";

export default function Dashboard() {
  // Convex queries - automatically reactive!
  const steps = useSteps();
  const paths = usePaths();
  const routines = useRoutines();

  // Convex mutations
  const createStepMutation = useCreateStep();
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();

  const createPathMutation = useCreatePath();
  const updatePathMutation = useUpdatePath();
  const deletePathMutation = useDeletePath();

  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const deleteRoutineMutation = useDeleteRoutine();
  const executeRoutineMutation = useExecuteRoutine();

  // UI state
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [quickAddValue, setQuickAddValue] = useState("");
  const [stepDescValue, setStepDescValue] = useState("");
  const [stepPathValue, setStepPathValue] = useState("");
  const [pathAddValue, setPathAddValue] = useState("");
  const [pathDescValue, setPathDescValue] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathForm, setEditPathForm] = useState({
    title: "",
    description: "",
  });
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepForm, setEditStepForm] = useState({
    title: "",
    description: "",
    pathId: "",
  });
  const [routineAddValue, setRoutineAddValue] = useState("");
  const [routineDescValue, setRoutineDescValue] = useState("");
  const [editingRoutine, setEditingRoutine] = useState<string | null>(null);
  const [editRoutineForm, setEditRoutineForm] = useState({
    title: "",
    description: "",
    stepTemplates: [] as StepTemplate[],
  });
  const [showEditRoutineModal, setShowEditRoutineModal] = useState(false);
  const [newStepTemplateTitle, setNewStepTemplateTitle] = useState("");
  const [newStepTemplateDesc, setNewStepTemplateDesc] = useState("");
  const [newStepTemplatePathId, setNewStepTemplatePathId] = useState("");
  const [newStepTemplatePriority, setNewStepTemplatePriority] = useState(false);

  // Loading state from queries
  const isLoading = steps === undefined || paths === undefined || routines === undefined;

  const createPath = async (title: string, description?: string) => {
    try {
      await createPathMutation({ title, description: description || "" });
      // No need to refetch - Convex auto-updates!
    } catch (error) {
      console.error("Error creating path:", error);
    }
  };

  const updatePath = async (id: string, title: string, description: string) => {
    try {
      await updatePathMutation({ id: id as Id<"paths">, title, description });
      setEditingPath(null);
    } catch (error) {
      console.error("Error updating path:", error);
    }
  };

  const startEditPath = (path: Path) => {
    setEditingPath(path._id);
    setEditPathForm({ title: path.title, description: path.description || "" });
  };

  const cancelEditPath = () => {
    setEditingPath(null);
    setEditPathForm({ title: "", description: "" });
  };

  const deletePath = async (id: string) => {
    await deletePathMutation({ id: id as Id<"paths"> });
  };

  const createRoutine = async (title: string, description?: string) => {
    try {
      await createRoutineMutation({
        title,
        description: description || "",
        stepTemplates: [],
      });
    } catch (error) {
      console.error("Error creating routine:", error);
    }
  };

  const updateRoutine = async (
    id: string,
    title: string,
    description: string,
    stepTemplates: StepTemplate[]
  ) => {
    try {
      const convexStepTemplates = stepTemplates.map(st => ({
        title: st.title,
        description: st.description,
        pathId: st.pathId ? st.pathId as Id<"paths"> : undefined,
        prioritizedToday: st.prioritizedToday,
      }));
      await updateRoutineMutation({ id: id as Id<"routines">, title, description, stepTemplates: convexStepTemplates });
      setEditingRoutine(null);
    } catch (error) {
      console.error("Error updating routine:", error);
    }
  };

  const startEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine._id);
    setEditRoutineForm({
      title: routine.title,
      description: routine.description || "",
      stepTemplates: routine.stepTemplates,
    });
    setShowEditRoutineModal(true);
  };

  const cancelEditRoutine = () => {
    setEditingRoutine(null);
    setEditRoutineForm({ title: "", description: "", stepTemplates: [] });
    setShowEditRoutineModal(false);
    setNewStepTemplateTitle("");
    setNewStepTemplateDesc("");
    setNewStepTemplatePathId("");
    setNewStepTemplatePriority(false);
  };

  const addStepTemplateToRoutine = () => {
    if (newStepTemplateTitle.trim()) {
      setEditRoutineForm({
        ...editRoutineForm,
        stepTemplates: [
          ...editRoutineForm.stepTemplates,
          {
            title: newStepTemplateTitle.trim(),
            description: newStepTemplateDesc.trim(),
            pathId: newStepTemplatePathId || undefined,
            prioritizedToday: newStepTemplatePriority,
          },
        ],
      });
      setNewStepTemplateTitle("");
      setNewStepTemplateDesc("");
      setNewStepTemplatePathId("");
      setNewStepTemplatePriority(false);
    }
  };

  const removeStepTemplateFromRoutine = (index: number) => {
    setEditRoutineForm({
      ...editRoutineForm,
      stepTemplates: editRoutineForm.stepTemplates.filter(
        (_, i) => i !== index
      ),
    });
  };

  const saveRoutineEdit = () => {
    if (editingRoutine && editRoutineForm.title.trim()) {
      updateRoutine(
        editingRoutine,
        editRoutineForm.title,
        editRoutineForm.description,
        editRoutineForm.stepTemplates
      );
      cancelEditRoutine();
    }
  };

  const deleteRoutine = async (id: string) => {
    await deleteRoutineMutation({ id: id as Id<"routines"> });
  };

  const instantiateRoutine = async (routineId: string) => {
    try {
      await executeRoutineMutation({ id: routineId as Id<"routines"> });
    } catch (error) {
      console.error("Error instantiating routine:", error);
    }
  };

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
        prioritizedToday: false,
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

  const togglePriority = async (id: string, currentValue: boolean) => {
    await updateStepMutation({
      id: id as Id<"steps">,
      prioritizedToday: !currentValue
    });
  };

  const deleteStep = async (id: string) => {
    await deleteStepMutation({ id: id as Id<"steps"> });
  };

  const toggleRoutineExpanded = (routineId: string) => {
    const newExpanded = new Set(expandedRoutines);
    if (newExpanded.has(routineId)) {
      newExpanded.delete(routineId);
    } else {
      newExpanded.add(routineId);
    }
    setExpandedRoutines(newExpanded);
  };

  const getPathStats = (pathId: string) => {
    if (!steps) return { total: 0, completed: 0, incomplete: 0 };

    const pathSteps = steps.filter((step) => {
      // Handle both populated path object and path ID string
      const stepPathId = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null);
      return stepPathId === pathId;
    });
    return {
      total: pathSteps.length,
      completed: pathSteps.filter((s) => s.completed).length,
      incomplete: pathSteps.filter((s) => !s.completed).length,
    };
  };

  const handleQuickAdd = () => {
    if (quickAddValue.trim()) {
      createStep(quickAddValue.trim(), stepDescValue.trim(), stepPathValue);
      setQuickAddValue("");
      setStepDescValue("");
      setStepPathValue("");
    }
  };

  const handlePathAdd = () => {
    if (pathAddValue.trim()) {
      createPath(pathAddValue.trim(), pathDescValue.trim());
      setPathAddValue("");
      setPathDescValue("");
    }
  };

  const handleRoutineAdd = () => {
    if (routineAddValue.trim()) {
      createRoutine(routineAddValue.trim(), routineDescValue.trim());
      setRoutineAddValue("");
      setRoutineDescValue("");
    }
  };

  const prioritySteps = steps?.filter((s) => s.prioritizedToday && !s.completed) || [];
  const regularSteps = steps?.filter((s) => !s.prioritizedToday && !s.completed) || [];
  const completedSteps = steps?.filter((s) => s.completed) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">Welcome, Aneesh</p>
        <h1 className="text-4xl font-bold">Today</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {/* Tabs */}
        <div className="flex justify-center space-x-1 pt-2">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2 transition-all duration-150 font-medium ${
              activeTab === "today"
                ? "border-b-2 border-white text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab("steps")}
            className={`px-4 py-2 transition-all duration-150 font-medium ${
              activeTab === "steps"
                ? "border-b-2 border-white text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Steps
          </button>
          <button
            onClick={() => setActiveTab("paths")}
            className={`px-4 py-2 transition-all duration-150 font-medium ${
              activeTab === "paths"
                ? "border-b-2 border-white text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Paths
          </button>
          <button
            onClick={() => setActiveTab("routines")}
            className={`px-4 py-2 transition-all duration-150 font-medium ${
              activeTab === "routines"
                ? "border-b-2 border-white text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Routines
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Priority Steps */}
          {prioritySteps.length > 0 ? (
            <div className="space-y-2">
              {prioritySteps.map((step) => (
                <StepCard
                  key={step._id}
                  step={step}
                  paths={paths || []}
                  onToggle={toggleStep}
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
              <p>No steps prioritized for today</p>
              <p className="text-sm mt-1">Star a step to add it here</p>
            </div>
          )}

          {/* Completed Today */}
          {completedSteps.filter((s) => s.prioritizedToday).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed (
                {completedSteps.filter((s) => s.prioritizedToday).length})
              </h2>
              <div className="space-y-2 opacity-60">
                {completedSteps
                  .filter((s) => s.prioritizedToday)
                  .map((step) => (
                    <StepCard
                      key={step._id}
                      step={step}
                      paths={paths || []}
                      onToggle={toggleStep}
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
      )}

      {activeTab === "steps" && (
        <div className="space-y-4">
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
                {paths?.map((path) => (
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
                {routines?.map((routine) => (
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
              <div className="space-y-2">
                {prioritySteps.map((step) => (
                  <StepCard
                    key={step._id}
                    step={step}
                    paths={paths || []}
                    onToggle={toggleStep}
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

          {/* Regular Steps */}
          {regularSteps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">All Steps</h2>
              <div className="space-y-2">
                {regularSteps.map((step) => (
                  <StepCard
                    key={step._id}
                    step={step}
                    paths={paths || []}
                    onToggle={toggleStep}
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
          {completedSteps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-muted-foreground">
                Completed ({completedSteps.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {completedSteps.map((step) => (
                  <StepCard
                    key={step._id}
                    step={step}
                    paths={paths || []}
                    onToggle={toggleStep}
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
      )}

      {activeTab === "paths" && (
        <div className="space-y-4">
          {/* Quick Add Path */}
          <div className="space-y-2">
            <Input
              placeholder="Path title..."
              value={pathAddValue}
              onChange={(e) => setPathAddValue(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !e.shiftKey && handlePathAdd()
              }
            />
            <div className="flex space-x-2">
              <Input
                placeholder="Description (optional)..."
                value={pathDescValue}
                onChange={(e) => setPathDescValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handlePathAdd()}
                className="flex-1"
              />
              <Button onClick={handlePathAdd} disabled={!pathAddValue.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Paths Grid */}
          {paths && paths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paths?.map((path) => (
                <Card
                  key={path._id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4">
                    {editingPath === path._id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Path title"
                          value={editPathForm.title}
                          onChange={(e) =>
                            setEditPathForm({
                              ...editPathForm,
                              title: e.target.value,
                            })
                          }
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={editPathForm.description}
                          onChange={(e) =>
                            setEditPathForm({
                              ...editPathForm,
                              description: e.target.value,
                            })
                          }
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              updatePath(
                                path._id,
                                editPathForm.title,
                                editPathForm.description
                              )
                            }
                            disabled={!editPathForm.title.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditPath}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between h-fit">
                          <div className="flex flex-col flex-1 h-full">
                            <h3 className="font-medium">{path.title}</h3>
                            {path.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {path.description}
                              </p>
                            )}
                            {(() => {
                              const stats = getPathStats(path._id);
                              return (
                                <div className="flex items-center space-x-3 mt-auto pt-2 text-xs text-muted-foreground">
                                  <span>{stats.completed} taken</span>
                                  <span>•</span>
                                  <span>
                                    {stats.incomplete} yet to be taken
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditPath(path)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePath(path._id)}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No paths yet</p>
              <p className="text-sm mt-1">Create a path to get started</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "routines" && (
        <div className="space-y-4">
          {/* Quick Add Routine */}
          <div className="space-y-2">
            <Input
              placeholder="Routine title..."
              value={routineAddValue}
              onChange={(e) => setRoutineAddValue(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !e.shiftKey && handleRoutineAdd()
              }
            />
            <div className="flex space-x-2">
              <Input
                placeholder="Description (optional)..."
                value={routineDescValue}
                onChange={(e) => setRoutineDescValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleRoutineAdd()}
                className="flex-1"
              />
              <Button
                onClick={handleRoutineAdd}
                disabled={!routineAddValue.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Routines Grid */}
          {routines && routines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {routines?.map((routine) => (
                <Card
                  key={routine._id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {routine.stepTemplates.length > 0 && (
                            <button
                              onClick={() => toggleRoutineExpanded(routine._id)}
                              className="flex-shrink-0"
                            >
                              {expandedRoutines.has(routine._id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <h3 className="font-medium">{routine.title}</h3>
                        </div>
                        {routine.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {routine.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {routine.stepTemplates.length} step
                          {routine.stepTemplates.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditRoutine(routine)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoutine(routine._id)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedRoutines.has(routine._id) &&
                      routine.stepTemplates.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Steps in Routine:
                          </p>
                          {routine.stepTemplates.map((template, index) => (
                            <div key={index} className="space-y-1 pl-6">
                              <div className="flex items-start space-x-2 text-sm">
                                <span className="text-muted-foreground">
                                  {index + 1}.
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p>{template.title}</p>
                                    {template.prioritizedToday && (
                                      <Star className="w-3 h-3 fill-primary text-primary" />
                                    )}
                                  </div>
                                  {template.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {template.description}
                                    </p>
                                  )}
                                  {template.pathId && (
                                    <p className="text-xs text-primary flex items-center mt-1">
                                      <Target className="w-3 h-3 mr-1" />
                                      {paths?.find(
                                        (p) => p._id === template.pathId
                                      )?.title || "Unknown Path"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No routines yet</p>
              <p className="text-sm mt-1">Create a routine to get started</p>
            </div>
          )}

          {/* Edit Routine Modal */}
          {showEditRoutineModal && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <CardContent className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
                  <h3 className="text-lg font-semibold">Edit Routine</h3>

                  {/* Routine Info */}
                  <div className="space-y-2">
                    <Input
                      placeholder="Routine title"
                      value={editRoutineForm.title}
                      onChange={(e) =>
                        setEditRoutineForm({
                          ...editRoutineForm,
                          title: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={editRoutineForm.description}
                      onChange={(e) =>
                        setEditRoutineForm({
                          ...editRoutineForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Steps</h4>

                    {editRoutineForm.stepTemplates.map(
                      (template, templateIndex) => (
                        <Card key={templateIndex} className="border-muted">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-sm">
                                    {template.title}
                                  </p>
                                  {template.prioritizedToday && (
                                    <Star className="w-3 h-3 fill-primary text-primary" />
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {template.description}
                                  </p>
                                )}
                                {template.pathId && (
                                  <p className="text-xs text-primary flex items-center">
                                    <Target className="w-3 h-3 mr-1" />
                                    {paths?.find(
                                      (p) => p._id === template.pathId
                                    )?.title || "Unknown Path"}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeStepTemplateFromRoutine(templateIndex)
                                }
                                className="h-6 w-6 p-0 ml-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}

                    {/* Add Step */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground">
                        Add Step
                      </p>
                      <Input
                        placeholder="Step title..."
                        value={newStepTemplateTitle}
                        onChange={(e) =>
                          setNewStepTemplateTitle(e.target.value)
                        }
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          addStepTemplateToRoutine()
                        }
                      />
                      <Input
                        placeholder="Description (optional)..."
                        value={newStepTemplateDesc}
                        onChange={(e) => setNewStepTemplateDesc(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addStepTemplateToRoutine()
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newStepTemplatePriority}
                            onChange={(e) =>
                              setNewStepTemplatePriority(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm">Priority</span>
                        </label>
                      </div>
                      <div className="flex space-x-2">
                        <select
                          className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={newStepTemplatePathId}
                          onChange={(e) =>
                            setNewStepTemplatePathId(e.target.value)
                          }
                        >
                          <option value="">No Path</option>
                          {paths?.map((path) => (
                            <option key={path._id} value={path._id}>
                              {path.title}
                            </option>
                          ))}
                        </select>
                        <Button
                          onClick={addStepTemplateToRoutine}
                          disabled={!newStepTemplateTitle.trim()}
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4 border-t border-border">
                    <Button
                      onClick={saveRoutineEdit}
                      disabled={!editRoutineForm.title.trim()}
                      className="flex-1"
                    >
                      Save Routine
                    </Button>
                    <Button variant="outline" onClick={cancelEditRoutine}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StepCardProps {
  step: Step;
  paths: Path[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  isEditing: boolean;
  editForm: { title: string; description: string; pathId: string };
  onStartEdit: (step: Step) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onEditFormChange: (
    updates: Partial<{ title: string; description: string; pathId: string }>
  ) => void;
}

function StepCard({
  step,
  paths,
  onToggle,
  onDelete,
  onTogglePriority,
  isEditing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
}: StepCardProps) {
  if (isEditing) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-3 space-y-2">
          <Input
            placeholder="Step title"
            value={editForm.title}
            onChange={(e) => onEditFormChange({ title: e.target.value })}
          />
          <Input
            placeholder="Description (optional)"
            value={editForm.description}
            onChange={(e) => onEditFormChange({ description: e.target.value })}
          />
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={editForm.pathId}
            onChange={(e) => onEditFormChange({ pathId: e.target.value })}
          >
            <option value="">No Path</option>
            {paths?.map((path) => (
              <option key={path._id} value={path._id}>
                {path.title}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() =>
                onSaveEdit(step._id, {
                  title: editForm.title,
                  description: editForm.description,
                  pathId: editForm.pathId as unknown as Path | null,
                })
              }
              disabled={!editForm.title.trim()}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => onToggle(step._id)}
            className="mt-0.5 flex-shrink-0"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                step.completed
                  ? "bg-primary border-primary"
                  : "border-muted-foreground hover:border-primary"
              }`}
            >
              {step.completed && <Check className="w-3 h-3 text-black" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span
                  className={`font-medium ${
                    step.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {step.title}
                </span>
                {step.recurring.enabled && (
                  <Repeat className="w-3 h-3 text-primary flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onTogglePriority(step._id, step.prioritizedToday)
                  }
                  className="h-7 w-7 p-0"
                >
                  <Star
                    className={`w-4 h-4 ${
                      step.prioritizedToday
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartEdit(step)}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(step._id)}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
            {(step.pathId || step.path) && (
              <div className="mt-1 text-xs text-primary flex items-center">
                <Target className="w-3 h-3 mr-1" />
                {step.path?.title || (typeof step.pathId === "object" && step.pathId ? step.pathId.title : "")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
