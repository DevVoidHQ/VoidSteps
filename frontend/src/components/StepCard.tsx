import { useState, useCallback, memo } from "react";
import type { Step, Path } from "@/types/index";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import {
  Check,
  X,
  Repeat,
  Star,
  Target,
  Pencil,
  XCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export interface StepCardProps {
  step: Step;
  paths: Path[];
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  // Hierarchy props
  depth?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  childProgress?: { completed: number; total: number };
  onToggleExpand?: (id: string) => void;
  isDropTarget?: boolean;
}

function StepCardComponent({
  step,
  paths,
  onToggle,
  onToggleFailed,
  onDelete,
  onTogglePriority,
  onSaveEdit,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  childProgress,
  onToggleExpand,
  isDropTarget = false,
}: StepCardProps) {
  // Local edit state - changes here don't re-render other cards
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    pathId: "",
  });

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditForm({
      title: step.title,
      description: step.description || "",
      pathId:
        typeof step.pathId === "object" && step.pathId
          ? step.pathId._id
          : (step.pathId as unknown as string) || "",
    });
  }, [step.title, step.description, step.pathId]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({ title: "", description: "", pathId: "" });
  }, []);

  const handleSave = useCallback(() => {
    onSaveEdit(step._id, {
      title: editForm.title,
      description: editForm.description,
      pathId: editForm.pathId as unknown as Path | null,
    });
    setIsEditing(false);
    setEditForm({ title: "", description: "", pathId: "" });
  }, [step._id, editForm, onSaveEdit]);

  const handleEditFormChange = useCallback(
    (updates: Partial<{ title: string; description: string; pathId: string }>) => {
      setEditForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  if (isEditing) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-3 space-y-2">
          <Input
            placeholder="Step title"
            value={editForm.title}
            onChange={(e) => handleEditFormChange({ title: e.target.value })}
          />
          <Input
            placeholder="Description (optional)"
            value={editForm.description}
            onChange={(e) => handleEditFormChange({ description: e.target.value })}
          />
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={editForm.pathId}
            onChange={(e) => handleEditFormChange({ pathId: e.target.value })}
          >
            <option value="">No Path</option>
            {paths?.map((path: Path) => (
              <option key={path._id} value={path._id}>
                {path.title}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editForm.title.trim()}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardClasses = [
    "hover:bg-muted/30 transition-all",
    step.failed === true ? "border-destructive/50" : "",
    isDropTarget ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
  ].filter(Boolean).join(" ");

  return (
    <Card className={cardClasses}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          {/* Expand/collapse button for parent steps */}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand?.(step._id)}
              className="mt-0.5 flex-shrink-0 p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            // Spacer for alignment when no children
            depth === 0 && <div className="w-5 flex-shrink-0" />
          )}
          <button
            onClick={() => onToggle(step._id)}
            className="mt-0.5 flex-shrink-0"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                step.completed
                  ? "bg-primary border-primary"
                  : step.failed === true
                  ? "bg-destructive border-destructive"
                  : "border-muted-foreground hover:border-primary"
              }`}
            >
              {step.completed && <Check className="w-3 h-3 text-black" />}
              {step.failed === true && <X className="w-3 h-3 text-black" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span
                  className={`font-medium ${
                    step.completed
                      ? "line-through text-muted-foreground"
                      : step.failed === true
                      ? "line-through text-destructive"
                      : ""
                  }`}
                >
                  {step.title}
                </span>
                {step.recurring.enabled && (
                  <Repeat className="w-3 h-3 text-primary flex-shrink-0" />
                )}
                {/* Progress indicator for collapsed parents */}
                {hasChildren && !isExpanded && childProgress && childProgress.total > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {childProgress.completed}/{childProgress.total}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                {onToggleFailed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFailed(step._id)}
                    className="h-7 w-7 p-0"
                  >
                    <XCircle
                      className={`w-4 h-4 ${
                        step.failed === true
                          ? "fill-destructive text-destructive"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                )}
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
                  onClick={handleStartEdit}
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

// Memoize to prevent unnecessary re-renders
export const StepCard = memo(StepCardComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if relevant props change
  return (
    prevProps.step._id === nextProps.step._id &&
    prevProps.step.title === nextProps.step.title &&
    prevProps.step.description === nextProps.step.description &&
    prevProps.step.completed === nextProps.step.completed &&
    prevProps.step.failed === nextProps.step.failed &&
    prevProps.step.prioritizedToday === nextProps.step.prioritizedToday &&
    prevProps.step.recurring?.enabled === nextProps.step.recurring?.enabled &&
    prevProps.step.path?._id === nextProps.step.path?._id &&
    prevProps.paths === nextProps.paths &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.onToggleFailed === nextProps.onToggleFailed &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onTogglePriority === nextProps.onTogglePriority &&
    prevProps.onSaveEdit === nextProps.onSaveEdit &&
    // Hierarchy props
    prevProps.depth === nextProps.depth &&
    prevProps.hasChildren === nextProps.hasChildren &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.childProgress?.completed === nextProps.childProgress?.completed &&
    prevProps.childProgress?.total === nextProps.childProgress?.total &&
    prevProps.onToggleExpand === nextProps.onToggleExpand &&
    prevProps.isDropTarget === nextProps.isDropTarget
  );
});
