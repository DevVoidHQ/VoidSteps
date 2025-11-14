import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Step, Path } from "@/types/index";
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
} from "lucide-react";

type TabType = 'today' | 'steps' | 'paths';

export default function Dashboard() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [quickAddValue, setQuickAddValue] = useState("");
  const [stepDescValue, setStepDescValue] = useState("");
  const [stepPathValue, setStepPathValue] = useState("");
  const [pathAddValue, setPathAddValue] = useState("");
  const [pathDescValue, setPathDescValue] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathForm, setEditPathForm] = useState({ title: "", description: "" });
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editStepForm, setEditStepForm] = useState({
    title: "",
    description: "",
    pathId: "",
  });

  useEffect(() => {
    fetchSteps();
    fetchPaths();
  }, []);

  const fetchSteps = async () => {
    const res = await api.get("/steps");
    setSteps(res.data);
  };

  const fetchPaths = async () => {
    const res = await api.get("/paths");
    setPaths(res.data);
  };

  const createPath = async (title: string, description?: string) => {
    try {
      await api.post("/paths", { title, description: description || "" });
      fetchPaths();
    } catch (error) {
      console.error("Error creating path:", error);
    }
  };

  const updatePath = async (id: string, title: string, description: string) => {
    try {
      await api.put(`/paths/${id}`, { title, description });
      fetchPaths();
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
    await api.delete(`/paths/${id}`);
    fetchPaths();
  };

  const createStep = async (title: string, description?: string, pathId?: string) => {
    try {
      await api.post("/steps", {
        title,
        description: description || "",
        pathId: pathId || null,
        prioritizedToday: false,
      });
      fetchSteps();
    } catch (error) {
      console.error("Error creating step:", error);
    }
  };

  const updateStep = async (id: string, updates: Partial<Step>) => {
    try {
      await api.put(`/steps/${id}`, updates);
      fetchSteps();
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
      pathId: typeof step.pathId === 'object' && step.pathId ? step.pathId._id : (step.pathId as string) || "",
    });
  };

  const cancelEditStep = () => {
    setEditingStep(null);
    setEditStepForm({ title: "", description: "", pathId: "" });
  };

  const toggleStep = async (id: string) => {
    await api.patch(`/steps/${id}/toggle`);
    fetchSteps();
  };

  const togglePriority = async (id: string, currentValue: boolean) => {
    await api.put(`/steps/${id}`, { prioritizedToday: !currentValue });
    fetchSteps();
  };

  const deleteStep = async (id: string) => {
    await api.delete(`/steps/${id}`);
    fetchSteps();
  };

  const addSubstep = async (stepId: string, title: string) => {
    await api.post(`/steps/${stepId}/substeps`, { title });
    fetchSteps();
  };

  const toggleSubstep = async (stepId: string, substepId: string) => {
    await api.patch(`/steps/${stepId}/substeps/${substepId}/toggle`);
    fetchSteps();
  };

  const toggleExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
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

  const prioritySteps = steps.filter((s) => s.prioritizedToday && !s.completed);
  const regularSteps = steps.filter((s) => !s.prioritizedToday && !s.completed);
  const completedSteps = steps.filter((s) => s.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
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
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'today'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'steps'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Steps
          </button>
          <button
            onClick={() => setActiveTab('paths')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'paths'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Paths
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && (
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
                {paths.map((path) => (
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

          {/* Priority Steps */}
          {prioritySteps.length > 0 ? (
            <div className="space-y-2">
              {prioritySteps.map((step) => (
                <StepCard
                  key={step._id}
                  step={step}
                  paths={paths}
                  onToggle={toggleStep}
                  onDelete={deleteStep}
                  onTogglePriority={togglePriority}
                  onAddSubstep={addSubstep}
                  onToggleSubstep={toggleSubstep}
                  onToggleExpanded={toggleExpanded}
                  isExpanded={expandedSteps.has(step._id)}
                  isEditing={editingStep === step._id}
                  editForm={editStepForm}
                  onStartEdit={startEditStep}
                  onCancelEdit={cancelEditStep}
                  onSaveEdit={updateStep}
                  onEditFormChange={(updates) => setEditStepForm({ ...editStepForm, ...updates })}
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
          {completedSteps.filter(s => s.prioritizedToday).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed ({completedSteps.filter(s => s.prioritizedToday).length})
              </h2>
              <div className="space-y-2 opacity-60">
                {completedSteps.filter(s => s.prioritizedToday).map((step) => (
                  <StepCard
                    key={step._id}
                    step={step}
                    paths={paths}
                    onToggle={toggleStep}
                    onDelete={deleteStep}
                    onTogglePriority={togglePriority}
                    onAddSubstep={addSubstep}
                    onToggleSubstep={toggleSubstep}
                    onToggleExpanded={toggleExpanded}
                    isExpanded={expandedSteps.has(step._id)}
                    isEditing={editingStep === step._id}
                    editForm={editStepForm}
                    onStartEdit={startEditStep}
                    onCancelEdit={cancelEditStep}
                    onSaveEdit={updateStep}
                    onEditFormChange={(updates) => setEditStepForm({ ...editStepForm, ...updates })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'steps' && (
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
                {paths.map((path) => (
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
                    paths={paths}
                    onToggle={toggleStep}
                    onDelete={deleteStep}
                    onTogglePriority={togglePriority}
                    onAddSubstep={addSubstep}
                    onToggleSubstep={toggleSubstep}
                    onToggleExpanded={toggleExpanded}
                    isExpanded={expandedSteps.has(step._id)}
                    isEditing={editingStep === step._id}
                    editForm={editStepForm}
                    onStartEdit={startEditStep}
                    onCancelEdit={cancelEditStep}
                    onSaveEdit={updateStep}
                    onEditFormChange={(updates) => setEditStepForm({ ...editStepForm, ...updates })}
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
                    paths={paths}
                    onToggle={toggleStep}
                    onDelete={deleteStep}
                    onTogglePriority={togglePriority}
                    onAddSubstep={addSubstep}
                    onToggleSubstep={toggleSubstep}
                    onToggleExpanded={toggleExpanded}
                    isExpanded={expandedSteps.has(step._id)}
                    isEditing={editingStep === step._id}
                    editForm={editStepForm}
                    onStartEdit={startEditStep}
                    onCancelEdit={cancelEditStep}
                    onSaveEdit={updateStep}
                    onEditFormChange={(updates) => setEditStepForm({ ...editStepForm, ...updates })}
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
                    paths={paths}
                    onToggle={toggleStep}
                    onDelete={deleteStep}
                    onTogglePriority={togglePriority}
                    onAddSubstep={addSubstep}
                    onToggleSubstep={toggleSubstep}
                    onToggleExpanded={toggleExpanded}
                    isExpanded={expandedSteps.has(step._id)}
                    isEditing={editingStep === step._id}
                    editForm={editStepForm}
                    onStartEdit={startEditStep}
                    onCancelEdit={cancelEditStep}
                    onSaveEdit={updateStep}
                    onEditFormChange={(updates) => setEditStepForm({ ...editStepForm, ...updates })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paths' && (
        <div className="space-y-4">
          {/* Quick Add Path */}
          <div className="space-y-2">
            <Input
              placeholder="Path title..."
              value={pathAddValue}
              onChange={(e) => setPathAddValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handlePathAdd()}
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
          {paths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paths.map((path) => (
                <Card key={path._id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    {editingPath === path._id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Path title"
                          value={editPathForm.title}
                          onChange={(e) => setEditPathForm({ ...editPathForm, title: e.target.value })}
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={editPathForm.description}
                          onChange={(e) => setEditPathForm({ ...editPathForm, description: e.target.value })}
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updatePath(path._id, editPathForm.title, editPathForm.description)}
                            disabled={!editPathForm.title.trim()}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditPath}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{path.title}</h3>
                          {path.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {path.description}
                            </p>
                          )}
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
    </div>
  );
}

interface StepCardProps {
  step: Step;
  paths: Path[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onAddSubstep: (stepId: string, title: string) => void;
  onToggleSubstep: (stepId: string, substepId: string) => void;
  onToggleExpanded: (stepId: string) => void;
  isExpanded: boolean;
  isEditing: boolean;
  editForm: { title: string; description: string; pathId: string };
  onStartEdit: (step: Step) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onEditFormChange: (updates: Partial<{ title: string; description: string; pathId: string }>) => void;
}

function StepCard({
  step,
  paths,
  onToggle,
  onDelete,
  onTogglePriority,
  onAddSubstep,
  onToggleSubstep,
  onToggleExpanded,
  isExpanded,
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
            {paths.map((path) => (
              <option key={path._id} value={path._id}>
                {path.title}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => onSaveEdit(step._id, {
                title: editForm.title,
                description: editForm.description,
                pathId: editForm.pathId || null,
              })}
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
                {step.substeps.length > 0 && (
                  <button onClick={() => onToggleExpanded(step._id)}>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                )}
                <span
                  className={`font-medium ${
                    step.completed
                      ? "line-through text-muted-foreground"
                      : ""
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
                  onClick={() => onTogglePriority(step._id, step.prioritizedToday)}
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
            {step.pathId && (
              <div className="mt-1 text-xs text-primary flex items-center">
                <Target className="w-3 h-3 mr-1" />
                {typeof step.pathId === "object" ? step.pathId.title : ""}
              </div>
            )}
            {isExpanded && step.substeps.length > 0 && (
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-muted">
                {step.substeps.map((substep) => (
                  <div
                    key={substep._id}
                    className="flex items-center space-x-2"
                  >
                    <button
                      onClick={() => onToggleSubstep(step._id, substep._id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          substep.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {substep.completed && (
                          <Check className="w-2 h-2 text-black" />
                        )}
                      </div>
                    </button>
                    <span
                      className={`text-sm ${
                        substep.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {substep.title}
                    </span>
                  </div>
                ))}
                <AddSubstepInput
                  onAdd={(title) => onAddSubstep(step._id, title)}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddSubstepInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="text-primary h-7"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add substep
      </Button>
    );
  }

  return (
    <div className="flex space-x-2">
      <Input
        placeholder="Substep title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        className="h-8 text-sm"
      />
      <Button size="sm" onClick={handleSubmit} className="h-8">
        Add
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAdding(false)}
        className="h-8"
      >
        Cancel
      </Button>
    </div>
  );
}
