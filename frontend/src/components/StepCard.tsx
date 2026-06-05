import { useState, useCallback, useRef, useEffect, memo } from "react";
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
  Clock,
  Calendar,
  Play,
  Pause,
  Timer,
  Trash2,
  Repeat,
  MoreHorizontal,
} from "lucide-react";
import { useElapsedTime, formatDuration } from "@/hooks/useTimer";
import { TimeEditDialog } from "@/components/TimeEditDialog";
import {
  getDueDateStatus,
  formatRelativeDate,
  formatRelativePast,
  formatAbsoluteDateTime,
  formatDateForInput,
  parseDateInput,
  parseStartDateInput,
} from "@/lib/date-utils";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/local-mutations";
import { useDeferDatesMode, useDueDatesMode, useShowStepDates, useStepActions, STEP_ACTION_ORDER, type StepActionKey, type StepClickAction } from "@/lib/preferences";
import type { ReactNode } from "react";

export interface StepCardProps {
  step: Step;
  paths: Path[];
  routines?: unknown[]; // Kept for backward compat but not used
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  // Date display context
  showStartDateBadge?: boolean;
  // Timer props
  onToggleTimer?: (id: string) => void;
  activeTimerStepId?: string | null;
  onSetTotalTime?: (id: string, totalTimeMs: number) => void;
  // What clicking the step's title/body does (page-configurable). Undefined = no-op.
  clickAction?: StepClickAction;
}

function StepCardComponent({
  step,
  paths,
  onToggle,
  onToggleFailed,
  onDelete,
  onTogglePriority,
  onSaveEdit,
  showStartDateBadge = false,
  onToggleTimer,
  activeTimerStepId,
  onSetTotalTime,
  clickAction,
}: StepCardProps) {
  const { success } = useToast();
  const deferEnabled = useDeferDatesMode() !== "off";
  const dueEnabled = useDueDatesMode() !== "off";
  const showStepDates = useShowStepDates();
  const actionCfg = useStepActions();

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

  // Time edit dialog state
  const [showTimeEdit, setShowTimeEdit] = useState(false);

  // "More" menu state for compact-mode actions
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Two-click confirm for destructive-ish actions (marking a step failed), so a
  // single stray click can't fail a task. Auto-disarms after a few seconds.
  const [confirmAction, setConfirmAction] = useState<StepActionKey | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetConfirm = useCallback(() => {
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
      confirmTimer.current = null;
    }
    setConfirmAction(null);
  }, []);
  const armConfirm = useCallback((key: StepActionKey) => {
    setConfirmAction(key);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmAction(null), 3000);
  }, []);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        resetConfirm();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, resetConfirm]);

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

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea, button, [role=listbox], [role=option]")) {
        if (!editForm.title.trim()) return;
        e.preventDefault();
        handleSave();
      }
    },
    [editForm.title, handleSave]
  );

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
  const isTimerActive = step._id === activeTimerStepId && step.timerStartedAt != null;
  const elapsedTime = useElapsedTime(
    isTimerActive ? step.timerStartedAt : undefined,
    step.totalTimeSpentMs || 0
  );

  const cardClasses = [
    "group hover:bg-muted/30 transition-all",
    step.failed === true ? "border-destructive/50" : "",
  ].filter(Boolean).join(" ");

  // Per-action descriptors. Each action is placed inline ("open") or inside the
  // "more" menu ("compact") per the user's Settings, independently.
  type ActionDesc = { key: StepActionKey; available: boolean; label: string; icon: ReactNode; onClick: () => void; confirm?: boolean };
  const descriptors: ActionDesc[] = [
    {
      key: "failed",
      available: !!onToggleFailed,
      // Confirm only when marking failed; unmarking is harmless.
      confirm: !step.failed,
      label: step.failed ? "Unmark failed" : "Mark failed",
      icon: (
        <XCircle
          className={`w-4 h-4 ${step.failed === true ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
        />
      ),
      onClick: () => onToggleFailed?.(step._id),
    },
    {
      key: "timer",
      available: !!onToggleTimer && !step.completed,
      label: isTimerActive ? "Stop timer" : "Start timer",
      icon: isTimerActive ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4" />,
      onClick: () => onToggleTimer?.(step._id),
    },
    {
      key: "priority",
      available: true,
      label: step.prioritizedToday ? "Remove priority" : "Prioritize",
      icon: (
        <Star
          className={`w-4 h-4 ${step.prioritizedToday ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      ),
      onClick: () => onTogglePriority(step._id, step.prioritizedToday),
    },
    {
      key: "time",
      available: !!onSetTotalTime && !step.completed,
      label: "Edit time",
      icon: <Clock className="w-4 h-4" />,
      onClick: () => setShowTimeEdit(true),
    },
    {
      key: "edit",
      available: true,
      label: "Edit step",
      icon: <Pencil className="w-4 h-4" />,
      onClick: handleStartEdit,
    },
    {
      key: "delete",
      available: true,
      label: "Delete step",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => setShowDeleteConfirm(true),
    },
  ];
  const ordered = STEP_ACTION_ORDER.map((k) => descriptors.find((d) => d.key === k)!).filter((d) => d.available);
  const inlineActions = ordered.filter((d) => actionCfg[d.key] === "open");
  const menuActions = ordered.filter((d) => actionCfg[d.key] === "compact");

  // First click on a confirm action arms it; second click runs it. Other clicks
  // run immediately and disarm any pending confirm.
  const runAction = (d: ActionDesc, fromMenu: boolean) => {
    if (d.confirm && confirmAction !== d.key) {
      armConfirm(d.key);
      return; // keep the menu open so the second click is reachable
    }
    resetConfirm();
    if (fromMenu) setMenuOpen(false);
    d.onClick();
  };

  // Clicking the step body runs the page-configured action.
  const handleStepClick = clickAction && clickAction !== "none"
    ? () => {
        if (clickAction === "prioritize") onTogglePriority(step._id, step.prioritizedToday);
        else if (clickAction === "play") { if (onToggleTimer && !step.completed) onToggleTimer(step._id); }
        else if (clickAction === "complete") onToggle(step._id);
      }
    : undefined;

  return (
    <>
      <Card className={cardClasses}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {/* Checkbox - larger, vertically centered */}
            <button
              data-tour="step-complete"
              onClick={() => onToggle(step._id)}
              className="flex-shrink-0"
            >
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  step.completed
                    ? "bg-accent border-accent"
                    : step.failed === true
                    ? "bg-destructive border-destructive"
                    : "border-muted-foreground hover:border-accent"
                }`}
              >
                {step.completed && <Check className="w-4 h-4 text-accent-foreground" />}
                {step.failed === true && <X className="w-4 h-4 text-destructive-foreground" />}
              </div>
            </button>

            {/* Middle: Content area (title + description + path). Clicking it
                runs the page-configured action (prioritize / play / complete). */}
            <div
              className={`flex-1 min-w-0 ${handleStepClick ? "cursor-pointer select-none" : ""}`}
              onClick={handleStepClick}
            >
              {/* Row 1: Title */}
              <div className="flex items-center space-x-2 min-w-0">
                <span
                  className={`font-medium min-w-0 [overflow-wrap:anywhere] ${
                    step.completed
                      ? "line-through text-muted-foreground"
                      : step.failed === true
                      ? "line-through text-destructive"
                      : ""
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {/* Row 2: Description (if any) */}
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1 [overflow-wrap:anywhere]">
                  {step.description}
                </p>
              )}

              {/* Badges row - all metadata tags in one wrapping line */}
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
                  {/* Timer badge - clickable to open time edit dialog */}
                  {!step.completed && onToggleTimer && (isTimerActive || (step.totalTimeSpentMs && step.totalTimeSpentMs > 0)) && (
                    onSetTotalTime ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowTimeEdit(true); }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Badge variant={isTimerActive ? "info" : "secondary"} size="sm" icon={<Timer className="w-3 h-3" />}>
                          {isTimerActive ? elapsedTime : formatDuration(step.totalTimeSpentMs || 0)}
                        </Badge>
                      </button>
                    ) : (
                      <Badge variant={isTimerActive ? "info" : "secondary"} size="sm" icon={<Timer className="w-3 h-3" />}>
                        {isTimerActive ? elapsedTime : formatDuration(step.totalTimeSpentMs || 0)}
                      </Badge>
                    )
                  )}
                </div>
              )}

              {/* Footer: created / last-updated metadata. Toggle in Settings. */}
              {showStepDates && step.createdAt != null && (() => {
                const created = Number(step.createdAt);
                const updated = Number(step.updatedAt);
                // Only surface "Updated" when it's meaningfully after creation.
                const showUpdated =
                  Number.isFinite(updated) && updated - created > 60_000;
                return (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-tight text-muted-foreground">
                    <span title={formatAbsoluteDateTime(created)}>
                      Created {formatRelativePast(created)}
                    </span>
                    {showUpdated && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span title={formatAbsoluteDateTime(updated)}>
                          Updated {formatRelativePast(updated)}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right: Action buttons. Each action is inline or in the "more"
                menu per Settings, independently. */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              {inlineActions.map((d) => {
                const armed = confirmAction === d.key;
                const btn = (
                  <IconButton
                    icon={
                      armed ? (
                        <Check className="w-4 h-4 text-destructive" />
                      ) : (
                        d.icon
                      )
                    }
                    aria-label={armed ? "Click again to confirm" : d.label}
                    title={armed ? "Click again to confirm" : undefined}
                    variant="ghost"
                    size="icon-sm"
                    className={armed ? "ring-1 ring-destructive" : undefined}
                    onClick={() => runAction(d, false)}
                  />
                );
                // Anchor the priority (star) action for the onboarding tour.
                return d.key === "priority" ? (
                  <span key={d.key} data-tour="step-prioritize" className="inline-flex">
                    {btn}
                  </span>
                ) : (
                  <span key={d.key} className="inline-flex">{btn}</span>
                );
              })}

              {menuActions.length > 0 && (
                <div className="relative" ref={menuRef}>
                  <IconButton
                    icon={<MoreHorizontal className="w-4 h-4 text-muted-foreground" />}
                    aria-label="More actions"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMenuOpen((o) => !o)}
                  />
                  {menuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-card py-1 shadow-lg">
                      {menuActions.map((d) => {
                        const armed = confirmAction === d.key;
                        return (
                          <button
                            key={d.key}
                            onClick={() => runAction(d, true)}
                            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm outline-none transition-colors focus-visible:bg-muted ${
                              armed ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="flex h-4 w-4 items-center justify-center">{d.icon}</span>
                            {armed ? "Click again to fail" : d.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
          <div className="space-y-3" onKeyDown={handleEditKeyDown}>
            <Input
              placeholder="Step title"
              value={editForm.title}
              onChange={(e) => handleEditFormChange({ title: e.target.value })}
              maxLength={MAX_TITLE_LENGTH}
            />
            <Input
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(e) => handleEditFormChange({ description: e.target.value })}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <HierarchicalPathSelector
              paths={paths || []}
              selectedPathId={editForm.pathId || null}
              onChange={(id) => handleEditFormChange({ pathId: id || "" })}
              placeholder="No Path"
              allowEmpty={true}
            />
            {(dueEnabled || step.dueDate || deferEnabled || step.startDate) && (
              <div className="flex gap-2">
                {(dueEnabled || step.dueDate) && (
                  <DatePicker
                    label="Due Date"
                    value={editForm.dueDate}
                    onChange={(val) => handleEditFormChange({ dueDate: val })}
                    className="flex-1"
                  />
                )}
                {(deferEnabled || step.startDate) && (
                  <DatePicker
                    label="Defer until"
                    value={editForm.startDate}
                    onChange={(val) => handleEditFormChange({ startDate: val })}
                    className="flex-1"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editForm.title.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Edit Dialog */}
      {onSetTotalTime && (
        <TimeEditDialog
          open={showTimeEdit}
          onOpenChange={setShowTimeEdit}
          currentTimeMs={step.totalTimeSpentMs || 0}
          isTimerRunning={isTimerActive}
          onApply={(newTotalMs) => onSetTotalTime(step._id, newTotalMs)}
        />
      )}

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
    prevProps.showStartDateBadge === nextProps.showStartDateBadge &&
    // Timer props
    prevProps.onToggleTimer === nextProps.onToggleTimer &&
    prevProps.activeTimerStepId === nextProps.activeTimerStepId &&
    prevProps.onSetTotalTime === nextProps.onSetTotalTime &&
    prevProps.clickAction === nextProps.clickAction
  );
});
