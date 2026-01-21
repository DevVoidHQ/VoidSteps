import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Path, StepTemplate } from "@/types/index";
import {
  useCreateRoutine,
  useUpdateRoutine,
  useRoutine,
} from "@/lib/convex-hooks";
import { useData } from "@/contexts/DataContext";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import {
  Plus,
  X,
  ArrowLeft,
  Star,
  Target,
} from "lucide-react";

export default function RoutineEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { paths } = useData();
  const isEditing = Boolean(id);

  const routine = useRoutine(id || null);
  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([]);

  // New step template form state
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepPathId, setNewStepPathId] = useState("");
  const [newStepPriority, setNewStepPriority] = useState(false);

  // Load routine data when editing
  useEffect(() => {
    if (isEditing && routine) {
      setTitle(routine.title);
      setDescription(routine.description || "");
      setStepTemplates(routine.stepTemplates);
    }
  }, [isEditing, routine]);

  const addStepTemplate = () => {
    if (newStepTitle.trim()) {
      setStepTemplates([
        {
          title: newStepTitle.trim(),
          description: newStepDesc.trim() || undefined,
          pathId: newStepPathId || undefined,
          prioritizedToday: newStepPriority,
        },
        ...stepTemplates,
      ]);
      setNewStepTitle("");
      setNewStepDesc("");
      setNewStepPathId("");
      setNewStepPriority(false);
    }
  };

  const removeStepTemplate = (index: number) => {
    setStepTemplates(stepTemplates.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      const convexStepTemplates = stepTemplates.map((st) => ({
        title: st.title,
        description: st.description,
        pathId: st.pathId ? (st.pathId as Id<"paths">) : undefined,
        prioritizedToday: st.prioritizedToday,
      }));

      if (isEditing && id) {
        await updateRoutineMutation({
          id: id as Id<"routines">,
          title: title.trim(),
          description: description.trim() || undefined,
          stepTemplates: convexStepTemplates,
        });
      } else {
        await createRoutineMutation({
          title: title.trim(),
          description: description.trim() || undefined,
          stepTemplates: convexStepTemplates,
        });
      }
      navigate("/routines");
    } catch (error) {
      console.error("Error saving routine:", error);
    }
  };

  const handleCancel = () => {
    navigate("/routines");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? "Edit Routine" : "Create Routine"}
        </h1>
      </div>

      {/* Routine Info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Routine title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Templates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Steps</h2>

        {/* Add Step Form */}
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Add Step</p>
            <Input
              placeholder="Step title..."
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && addStepTemplate()}
            />
            <Input
              placeholder="Description (optional)..."
              value={newStepDesc}
              onChange={(e) => setNewStepDesc(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addStepTemplate()}
            />
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStepPriority}
                  onChange={(e) => setNewStepPriority(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">Priority</span>
              </label>
            </div>
            <div className="flex space-x-2">
              <select
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newStepPathId}
                onChange={(e) => setNewStepPathId(e.target.value)}
              >
                <option value="">No Path</option>
                {paths?.map((path: Path) => (
                  <option key={path._id} value={path._id}>
                    {path.title}
                  </option>
                ))}
              </select>
              <Button
                onClick={addStepTemplate}
                disabled={!newStepTitle.trim()}
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Step Templates */}
        {stepTemplates.length > 0 ? (
          <div className="space-y-2">
            {stepTemplates.map((template, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm">{template.title}</p>
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
                          {paths?.find((p: Path) => p._id === template.pathId)?.title ||
                            "Unknown Path"}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStepTemplate(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No steps added yet</p>
            <p className="text-xs mt-1">Add steps above to build your routine</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1"
        >
          {isEditing ? "Save Changes" : "Create Routine"}
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
