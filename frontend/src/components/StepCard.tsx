import { useState, useCallback, memo } from "react";
import type { Step, Path, Routine } from "@/types/index";
import { Button, Input, Card, CardContent, Badge } from "@devvoid/ui";
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
  Clock,
  Calendar,
} from "lucide-react";
import {
  getDueDateStatus,
  formatRelativeDate,
  formatDateForInput,
  parseDateInput,
  parseStartDateInput,
} from "@/lib/date-utils";

export interface StepCardProps {
  step: Step;
  paths: Path[];
  routines?: Routine[];
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
  // Date display context
  showStartDateBadge?: boolean;
}

function StepCardComponent({
  step,
  paths,
  routines,
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
  showStartDateBadge = false,
}: StepCardProps) {
  // Local edit state - changes here don't re-render other cards
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    pathId: "",
    dueDate: "",
    startDate: "",
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
      dueDate: formatDateForInput(step.dueDate),
      startDate: formatDateForInput(step.startDate),
    });
  }, [step.title, step.description, step.pathId, step.dueDate, step.startDate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({ title: "", description: "", pathId: "", dueDate: "", startDate: "" });
  }, []);

  const handleSave = useCallback(() => {
    onSaveEdit(step._id, {
      title: editForm.title,
      description: editForm.description,
      pathId: editForm.pathId as unknown as Path | null,
      dueDate: parseDateInput(editForm.dueDate),
      startDate: parseStartDateInput(editForm.startDate),
    });
    setIsEditing(false);
    setEditForm({ title: "", description: "", pathId: "", dueDate: "", startDate: "" });
  }, [step._id, editForm, onSaveEdit]);

  const handleEditFormChange = useCallback(
    (updates: Partial<{ title: string; description: string; pathId: string; dueDate: string; startDate: string }>) => {
      setEditForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Compute date status for display
  const dueDateStatus = getDueDateStatus(step.dueDate);

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
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <input
                type="date"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] cursor-pointer"
                value={editForm.dueDate}
                onChange={(e) => handleEditFormChange({ dueDate: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <input
                type="date"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground [color-scheme:dark] cursor-pointer"
                value={editForm.startDate}
                onChange={(e) => handleEditFormChange({ startDate: e.target.value })}
              />
            </div>
          </div>
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
        <div className="flex items-center space-x-3">
          {/* Left: Expand button */}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand?.(step._id)}
              className="flex-shrink-0 p-0.5 hover:bg-muted rounded"
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

          {/* Checkbox - larger, vertically centered */}
          <button
            onClick={() => onToggle(step._id)}
            className="flex-shrink-0"
          >
            <div
              className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                step.completed
                  ? "bg-primary border-primary"
                  : step.failed === true
                  ? "bg-destructive border-destructive"
                  : "border-muted-foreground hover:border-primary"
              }`}
            >
              {step.completed && <Check className="w-4 h-4 text-black" />}
              {step.failed === true && <X className="w-4 h-4 text-black" />}
            </div>
          </button>

          {/* Middle: Content area (title + description + path) */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Title + recurring + progress */}
            <div className="flex items-center space-x-2">
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

            {/* Row 2: Description (if any) */}
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            )}

            {/* Row 3: Path */}
            {(step.pathId || step.path) && (
              <div className="text-xs text-primary flex items-center mt-1">
                <Target className="w-3 h-3 mr-1" />
                {step.path?.title || (typeof step.pathId === "object" && step.pathId ? step.pathId.title : "")}
              </div>
            )}

            {/* Row 4: Date badges (only when not completed) */}
            {!step.completed && (
              <div className="flex items-center gap-2 mt-1">
                {/* Due date badge */}
                {step.dueDate && dueDateStatus === 'overdue' && (
                  <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatRelativeDate(step.dueDate)}
                  </span>
                )}
                {step.dueDate && dueDateStatus === 'due-soon' && (
                  <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Due {formatRelativeDate(step.dueDate).toLowerCase()}
                  </span>
                )}
                {step.dueDate && dueDateStatus === 'upcoming' && (
                  <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1" />
                    Due {formatRelativeDate(step.dueDate).toLowerCase()}
                  </span>
                )}
                {/* Start date badge (only shown in upcoming section) */}
                {showStartDateBadge && step.startDate && (
                  <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatRelativeDate(step.startDate, true)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Routine Badge + Action buttons - vertically centered */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Routine Badge */}
            {step.routineId && (
              <Badge variant="secondary" className="text-sm px-2 py-0.5 mr-1">
                {routines?.find(r => r._id === step.routineId)?.title || "Routine"}
              </Badge>
            )}
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
    prevProps.step.routineId === nextProps.step.routineId &&
    prevProps.step.dueDate === nextProps.step.dueDate &&
    prevProps.step.startDate === nextProps.step.startDate &&
    prevProps.paths === nextProps.paths &&
    prevProps.routines === nextProps.routines &&
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
    prevProps.isDropTarget === nextProps.isDropTarget &&
    prevProps.showStartDateBadge === nextProps.showStartDateBadge
  );
});
