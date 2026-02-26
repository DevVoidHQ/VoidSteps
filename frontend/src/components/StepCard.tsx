import { useState, useCallback, memo } from "react";
import type { Step, Path } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/contexts/ToastContext";
import {
  Check,
  X,
  Star,
  Target,
  Pencil,
  XCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  Calendar,
  Play,
  Pause,
  Timer,
  Trash2,
  Repeat,
} from "lucide-react";
import { useElapsedTime, formatDuration } from "@/hooks/useTimer";
import {
  getDueDateStatus,
  formatRelativeDate,
  formatDateForInput,
  parseDateInput,
  parseStartDateInput,
} from "@/lib/date-utils";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";

export interface StepCardProps {
  step: Step;
  paths: Path[];
  routines?: unknown[]; // Kept for backward compat but not used
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
  // Timer props
  onToggleTimer?: (id: string) => void;
  activeTimerStepId?: string | null;
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
  showStartDateBadge = false,
  onToggleTimer,
  activeTimerStepId,
}: StepCardProps) {
  const { success } = useToast();

  // Local edit state - changes here don't re-render other cards
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    pathId: "",
    dueDate: "",
    startDate: "",
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    success("Step updated");
  }, [step._id, editForm, onSaveEdit, success]);

  const handleEditFormChange = useCallback(
    (updates: Partial<{ title: string; description: string; pathId: string; dueDate: string; startDate: string }>) => {
      setEditForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const handleDelete = useCallback(() => {
    onDelete(step._id);
    success("Step deleted");
  }, [step._id, onDelete, success]);

  // Compute date status for display
  const dueDateStatus = getDueDateStatus(step.dueDate);

  // Timer state
  const isTimerActive = step._id === activeTimerStepId && step.timerStartedAt !== undefined;
  const elapsedTime = useElapsedTime(
    isTimerActive ? step.timerStartedAt : undefined,
    step.totalTimeSpentMs || 0
  );

  const cardClasses = [
    "group hover:bg-muted/30 transition-all",
    step.failed === true ? "border-destructive/50" : "",
    isDropTarget ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
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
              {/* Row 1: Title + progress */}
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

              {/* Badges row — all metadata tags in one wrapping line */}
              {(step.pathId || step.path || step.routineId || (!step.completed && (step.dueDate || (showStartDateBadge && step.startDate) || (onToggleTimer && (isTimerActive || (step.totalTimeSpentMs && step.totalTimeSpentMs > 0)))))) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {/* Path badge */}
                  {(step.pathId || step.path) && (
                    <Badge variant="secondary" size="sm" icon={<Target className="w-3 h-3" />}>
                      {step.path?.title || (typeof step.pathId === "object" && step.pathId ? step.pathId.title : "")}
                    </Badge>
                  )}
                  {/* Routine badge */}
                  {step.routineId && (
                    <Badge variant="secondary" size="sm" icon={<Repeat className="w-3 h-3" />}>
                      Routine
                    </Badge>
                  )}
                  {/* Due date badges (only when not completed) */}
                  {!step.completed && step.dueDate && dueDateStatus === 'overdue' && (
                    <Badge variant="destructive" size="sm" icon={<Clock className="w-3 h-3" />}>
                      {formatRelativeDate(step.dueDate)}
                    </Badge>
                  )}
                  {!step.completed && step.dueDate && dueDateStatus === 'due-soon' && (
                    <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
                      Due {formatRelativeDate(step.dueDate).toLowerCase()}
                    </Badge>
                  )}
                  {!step.completed && step.dueDate && dueDateStatus === 'upcoming' && (
                    <Badge variant="secondary" size="sm" icon={<Clock className="w-3 h-3" />}>
                      Due {formatRelativeDate(step.dueDate).toLowerCase()}
                    </Badge>
                  )}
                  {/* Start date badge */}
                  {!step.completed && showStartDateBadge && step.startDate && (
                    <Badge variant="secondary" size="sm" icon={<Calendar className="w-3 h-3" />}>
                      {formatRelativeDate(step.startDate, true)}
                    </Badge>
                  )}
                  {/* Timer badge */}
                  {!step.completed && onToggleTimer && (isTimerActive || (step.totalTimeSpentMs && step.totalTimeSpentMs > 0)) && (
                    <Badge variant={isTimerActive ? "info" : "secondary"} size="sm" icon={<Timer className="w-3 h-3" />}>
                      {isTimerActive ? elapsedTime : formatDuration(step.totalTimeSpentMs || 0)}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Right: Action buttons - vertically centered, visible on hover */}
            <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Timer button */}
              {onToggleTimer && !step.completed && (
                <IconButton
                  icon={isTimerActive ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4" />}
                  aria-label={isTimerActive ? "Stop timer" : "Start timer"}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleTimer(step._id)}
                />
              )}
              {/* Failed toggle button */}
              {onToggleFailed && (
                <IconButton
                  icon={
                    <XCircle
                      className={`w-4 h-4 ${
                        step.failed === true
                          ? "fill-destructive text-destructive"
                          : "text-muted-foreground"
                      }`}
                    />
                  }
                  aria-label={step.failed ? "Unmark failed" : "Mark failed"}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleFailed(step._id)}
                />
              )}
              {/* Priority toggle button */}
              <IconButton
                icon={
                  <Star
                    className={`w-4 h-4 ${
                      step.prioritizedToday
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                }
                aria-label={step.prioritizedToday ? "Remove priority" : "Prioritize"}
                variant="ghost"
                size="icon-sm"
                onClick={() => onTogglePriority(step._id, step.prioritizedToday)}
              />
              {/* Edit button */}
              <IconButton
                icon={<Pencil className="w-4 h-4" />}
                aria-label="Edit step"
                variant="ghost"
                size="icon-sm"
                onClick={handleStartEdit}
              />
              {/* Delete button */}
              <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                aria-label="Delete step"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowDeleteConfirm(true)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <HierarchicalPathSelector
              paths={paths || []}
              selectedPathId={editForm.pathId || null}
              onChange={(id) => handleEditFormChange({ pathId: id || "" })}
              placeholder="No Path"
              allowEmpty={true}
            />
            <div className="flex gap-2">
              <DatePicker
                label="Due Date"
                value={editForm.dueDate}
                onChange={(val) => handleEditFormChange({ dueDate: val })}
                className="flex-1"
              />
              <DatePicker
                label="Start Date"
                value={editForm.startDate}
                onChange={(val) => handleEditFormChange({ startDate: val })}
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editForm.title.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Step"
        description={`Are you sure you want to delete "${step.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
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
    prevProps.step.path?._id === nextProps.step.path?._id &&
    prevProps.step.dueDate === nextProps.step.dueDate &&
    prevProps.step.startDate === nextProps.step.startDate &&
    prevProps.step.timerStartedAt === nextProps.step.timerStartedAt &&
    prevProps.step.totalTimeSpentMs === nextProps.step.totalTimeSpentMs &&
    prevProps.step.routineId === nextProps.step.routineId &&
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
    prevProps.isDropTarget === nextProps.isDropTarget &&
    prevProps.showStartDateBadge === nextProps.showStartDateBadge &&
    // Timer props
    prevProps.onToggleTimer === nextProps.onToggleTimer &&
    prevProps.activeTimerStepId === nextProps.activeTimerStepId
  );
});
