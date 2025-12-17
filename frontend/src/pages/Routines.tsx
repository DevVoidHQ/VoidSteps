import { useState } from "react";
import type { Path, Routine, StepTemplate } from "@/types/index";
import {
  usePaths,
  useRoutines,
  useCreateRoutine,
  useUpdateRoutine,
  useDeleteRoutine,
  useExecuteRoutine,
} from "@/lib/convex-hooks";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Target,
  Pencil,
  Zap,
} from "lucide-react";

export default function Routines() {
  const paths = usePaths();
  const routines = useRoutines();

  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const deleteRoutineMutation = useDeleteRoutine();
  const executeRoutineMutation = useExecuteRoutine();

  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(new Set());
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

  const toggleRoutineExpanded = (routineId: string) => {
    const newExpanded = new Set(expandedRoutines);
    if (newExpanded.has(routineId)) {
      newExpanded.delete(routineId);
    } else {
      newExpanded.add(routineId);
    }
    setExpandedRoutines(newExpanded);
  };

  const handleRoutineAdd = () => {
    if (routineAddValue.trim()) {
      createRoutine(routineAddValue.trim(), routineDescValue.trim());
      setRoutineAddValue("");
      setRoutineDescValue("");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Routines</h1>

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
          {routines?.map((routine: Routine) => (
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
                      {routine.stepTemplates.map((template: StepTemplate, index: number) => (
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
                                    (p: Path) => p._id === template.pathId
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
        <div className="fixed inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border-2 border-border shadow-2xl">
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
                                  (p: Path) => p._id === template.pathId
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
                      {paths?.map((path: Path) => (
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
  );
}
