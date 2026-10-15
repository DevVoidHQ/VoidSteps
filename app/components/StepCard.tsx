import { StepDialog, type StepDialogTab } from "@/components/StepDialog";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/contexts/ToastContext";
import { formatDuration, useElapsedTime } from "@/hooks/useTimer";
import {
  formatAbsoluteDateTime,
  formatRelativeDate,
  formatRelativePast,
  getDueDateStatus,
} from "@/lib/date-utils";
import { describePostponeDate, resolvePostponeDate } from "@/lib/postpone";
import { PostponeInput } from "@/components/PostponeInput";
import { useShowStepDates } from "@/lib/preferences";
import type { Path, Step } from "@/types/index";
import {
  Calendar,
  CalendarClock,
  Check,
  Clock,
  History,
  Pause,
  Pencil,
  Play,
  Repeat,
  Star,
  Target,
  Timer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { clearReveal, closeStep, toggleStep, useStepExpansion } from "@/lib/expanded-step";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Popover } from "radix-ui";

// Card tags: the Badge look at regular weight, so the title leads.
const TAG = "font-normal";

type StepActionKey = "failed" | "timer" | "priority" | "postpone" | "open" | "edit" | "delete";
// The same buttons on every card, no configuration. Everything else lives in
// the open card's numbered strip.
const QUICK_ACTIONS: StepActionKey[] = ["timer", "priority", "postpone", "failed"];
const DETAIL_ACTIONS: StepActionKey[] = [
  "timer",
  "priority",
  "postpone",
  "failed",
  "open",
  "edit",
  "delete",
];

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
}: StepCardProps) {
  const { success } = useToast();

  const [powerOpen, setPowerOpen] = useState<StepActionKey | null>(null);
  const postponeTo = (dueDate: number | undefined) => {
    if (dueDate === undefined) return;
    onSaveEdit(step._id, { dueDate });
    success(`Postponed to ${describePostponeDate(dueDate)}`);
  };
  const showStepDates = useShowStepDates();

  // The step's detail dialog (Details edit form | Activity timeline).
  const [dialog, setDialog] = useState<{ open: boolean; tab: StepDialogTab; addTime?: boolean }>({
    open: false,
    tab: "details",
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // The open card's "Postpone…" field.
  const [postponing, setPostponing] = useState(false);

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
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  const handleStartEdit = useCallback(() => {
    setDialog({ open: true, tab: "details" });
  }, []);

  const handleOpenTimeEntry = useCallback(() => {
    setDialog({ open: true, tab: "activity", addTime: true });
  }, []);

  const handleOpenActivity = useCallback(() => {
    setDialog({ open: true, tab: "activity" });
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, updates: Partial<Step>) => {
      onSaveEdit(id, updates);
      success("Step updated");
    },
    [onSaveEdit, success]
  );

  const handleDelete = useCallback(() => {
    onDelete(step._id);
    success("Step deleted");
  }, [step._id, onDelete, success]);

  // Compute date status for display
  const dueDateStatus = getDueDateStatus(step.dueDate);

  // Timer state. Read from the step itself: timers run in parallel, so there
  // is no single active id to compare against.
  const isTimerActive = step.timerStartedAt != null;
  const elapsedTime = useElapsedTime(
    isTimerActive ? step.timerStartedAt : undefined,
    step.totalTimeSpentMs || 0
  );

  const cardClasses = [
    "group hover:bg-muted/30 transition-all",
    step.failed === true ? "border-destructive/50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Per-action descriptors. Each action is placed inline ("open") or inside the
  // "more" menu ("compact") per the user's Settings, independently.
  // Every action has a simple form on click. An action may also carry a power
  // form, opened with Option-click, right-click or Option+Enter, shown in a
  // popover anchored to the button.
  type ActionDesc = {
    key: StepActionKey;
    available: boolean;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    confirm?: boolean;
    power?: { hint: string; render: (close: () => void) => ReactNode };
  };
  const descriptors: ActionDesc[] = [
    {
      key: "failed",
      available: !!onToggleFailed,
      // Confirm only when marking failed; unmarking is harmless.
      confirm: !step.failed,
      label: step.failed ? "Unmark failed" : "Mark failed",
      icon: (
        <XCircle
          className={`w-4 h-4 ${step.failed === true ? "fill-destructive text-destructive-ink" : "text-muted-foreground"}`}
        />
      ),
      onClick: () => onToggleFailed?.(step._id),
    },
    {
      key: "timer",
      available: !!onToggleTimer && !step.completed,
      label: isTimerActive ? "Stop timer" : "Start timer",
      icon: isTimerActive ? (
        <Pause className="w-4 h-4 text-primary" />
      ) : (
        <Play className="w-4 h-4" />
      ),
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
      // Click postpones to tomorrow; the power form takes any amount or day.
      key: "postpone",
      available: !step.completed,
      label: "Postpone to tomorrow",
      icon: <CalendarClock className="w-4 h-4" />,
      onClick: () => postponeTo(resolvePostponeDate("tomorrow")),
      power: {
        hint: "Postpone by…",
        render: (close) => (
          <PostponeInput
            onApply={(dueDate) => {
              close();
              postponeTo(dueDate);
            }}
          />
        ),
      },
    },
    {
      key: "open",
      available: true,
      label: "Time & activity",
      icon: <History className="w-4 h-4" />,
      onClick: handleOpenActivity,
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
  const byKey = (k: StepActionKey) => descriptors.find((d) => d.key === k)!;
  const inlineActions = QUICK_ACTIONS.map(byKey).filter((d) => d.available);

  // The open card's numbered strip: completing first, then every action.
  // 1 to 9 run them while the card is open. Postpone here is the general
  // form: any amount or day.
  const strip: (Omit<ActionDesc, "key"> & { key: StepActionKey | "complete" })[] = [
    {
      key: "complete" as const,
      available: true,
      label: step.completed ? "Mark not done" : "Complete",
      icon: <Check className="w-4 h-4" />,
      onClick: () => onToggle(step._id),
    },
    ...DETAIL_ACTIONS.map(byKey)
      .filter((d) => d.available)
      .map((d) =>
        d.key === "postpone"
          ? { ...d, label: "Postpone…", onClick: () => setPostponing((v) => !v) }
          : d
      ),
  ].slice(0, 9);

  // First click on a confirm action arms it; second click runs it. Other clicks
  // run immediately and disarm any pending confirm.
  const runAction = (
    d: Pick<ActionDesc, "confirm" | "onClick"> & { key: StepActionKey | "complete" }
  ) => {
    if (d.confirm && d.key !== "complete" && confirmAction !== d.key) {
      armConfirm(d.key);
      return; // keep the menu open so the second click is reachable
    }
    resetConfirm();

    d.onClick();
  };

  // Open card: number keys run the strip, Esc closes. Refs keep the window
  // listener on the latest closures without re-binding every render.
  const { open, reveal } = useStepExpansion(step._id);
  const keyTarget = useRef({ strip, runAction });
  useLayoutEffect(() => {
    keyTarget.current = { strip, runAction };
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // A dialog or menu on top owns the keyboard.
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return;
      if (e.key === "Escape") {
        setPostponing(false);
        closeStep();
        return;
      }
      const n = Number(e.key);
      const { strip, runAction } = keyTarget.current;
      if (Number.isInteger(n) && n >= 1 && n <= strip.length) {
        e.preventDefault();
        runAction(strip[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setPostponing(false);
    toggleStep(step._id);
  };

  // Opened from the command bar: bring the card into view and focus it.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !reveal) return;
    cardRef.current?.scrollIntoView({ block: "center" });
    cardRef.current?.focus({ preventScroll: true });
    clearReveal();
  }, [open, reveal]);

  const isOverdue = !step.completed && step.dueDate && dueDateStatus === "overdue";
  const showTimer =
    !step.completed && !!onToggleTimer && (isTimerActive || (step.totalTimeSpentMs ?? 0) > 0);
  const dueText = !step.dueDate
    ? null
    : dueDateStatus === "overdue"
      ? formatRelativeDate(step.dueDate)
      : `Due ${formatRelativeDate(step.dueDate).toLowerCase()}`;

  return (
    <>
      <div
        ref={cardRef}
        data-step-id={step._id}
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className={cn(cardClasses, open && "shadow-elev-2")}>
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              {/* Checkbox - larger, vertically centered */}
              <button
                onClick={() => onToggle(step._id)}
                aria-label={step.completed ? "Mark not done" : "Complete"}
                className="flex-shrink-0 rounded"
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

              {/* Middle: title and one quiet meta line. Clicking opens the
                card's details. */}
              <div
                // The reading area: at most 800px, the actions follow it.
                className="flex-1 min-w-0 max-w-[50rem] cursor-pointer select-none"
                onClick={toggle}
              >
                <span
                  className={`block type-step min-w-0 [overflow-wrap:anywhere] ${
                    step.completed
                      ? "line-through text-muted-foreground"
                      : step.failed === true
                        ? "line-through text-destructive-ink"
                        : ""
                  }`}
                >
                  {step.title}
                </span>

                {(step.path ||
                  step.routineId ||
                  (!step.completed && step.dueDate) ||
                  showTimer ||
                  (!step.completed && showStartDateBadge && step.startDate)) && (
                  // Tags at regular weight, so the title leads.
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {step.path && (
                      <Badge
                        variant="secondary"
                        size="sm"
                        className={TAG}
                        icon={<Target className="h-3 w-3" />}
                      >
                        {step.path.title}
                      </Badge>
                    )}
                    {step.routineId && (
                      <Badge
                        variant="secondary"
                        size="sm"
                        className={TAG}
                        icon={<Repeat className="h-3 w-3" />}
                      >
                        Routine
                      </Badge>
                    )}
                    {!step.completed && dueText && (
                      <Badge
                        variant={dueDateStatus === "due-soon" ? "warning" : "secondary"}
                        size="sm"
                        className={cn(TAG, isOverdue && "bg-destructive/10 text-destructive-ink")}
                        icon={<Clock className="h-3 w-3" />}
                      >
                        {dueText}
                      </Badge>
                    )}
                    {!step.completed && showStartDateBadge && step.startDate && (
                      <Badge
                        variant="secondary"
                        size="sm"
                        className={TAG}
                        icon={<Calendar className="h-3 w-3" />}
                      >
                        {formatRelativeDate(step.startDate, true)}
                      </Badge>
                    )}
                    {showTimer && (
                      // Opens the time log, where the sessions live.
                      <button
                        type="button"
                        aria-label="Open time log"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTimeEntry();
                        }}
                        className="transition-opacity hover:opacity-80"
                      >
                        <Badge
                          variant="secondary"
                          size="sm"
                          className={cn(TAG, "tabular-nums")}
                          icon={<Timer className="h-3 w-3" />}
                        >
                          {isTimerActive ? elapsedTime : formatDuration(step.totalTimeSpentMs || 0)}
                        </Badge>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: the fixed quick buttons. */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {inlineActions.map((d) => {
                  const armed = confirmAction === d.key;
                  const power = d.power;
                  const openPower = () => {
                    resetConfirm();
                    setPowerOpen(d.key);
                  };
                  const btn = (
                    <IconButton
                      icon={armed ? <Check className="w-4 h-4 text-destructive-ink" /> : d.icon}
                      aria-label={armed ? "Click again to confirm" : d.label}
                      aria-keyshortcuts={power ? "Alt+Enter" : undefined}
                      title={
                        armed
                          ? "Click again to confirm"
                          : power
                            ? `${d.label} · ⌥-click: ${power.hint}`
                            : undefined
                      }
                      variant="ghost"
                      size="icon-sm"
                      className={armed ? "ring-1 ring-destructive" : undefined}
                      onClick={(e) => {
                        if (power && e.altKey) openPower();
                        else runAction(d);
                      }}
                      onContextMenu={
                        power
                          ? (e) => {
                              e.preventDefault();
                              openPower();
                            }
                          : undefined
                      }
                      onKeyDown={
                        power
                          ? (e) => {
                              if (e.key === "Enter" && e.altKey) {
                                e.preventDefault();
                                openPower();
                              }
                            }
                          : undefined
                      }
                    />
                  );
                  if (!power) {
                    return (
                      <span key={d.key} className="inline-flex">
                        {btn}
                      </span>
                    );
                  }
                  return (
                    <Popover.Root
                      key={d.key}
                      open={powerOpen === d.key}
                      onOpenChange={(open) => setPowerOpen(open ? d.key : null)}
                    >
                      <Popover.Anchor asChild>
                        <span className="inline-flex">{btn}</span>
                      </Popover.Anchor>
                      <Popover.Portal>
                        <Popover.Content
                          align="end"
                          sideOffset={4}
                          // React bubbles events through portals to the card.
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="z-50 rounded-lg bg-popover p-3 shadow-elev-3 animate-in fade-in-0 zoom-in-95 duration-150"
                        >
                          {power.render(() => setPowerOpen(null))}
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  );
                })}
              </div>
            </div>

            {open && (
              // Lines up with the title: checkbox (1.5rem) plus the gap (0.75rem).
              <div className="mt-3 space-y-3 pl-9">
                {step.description && <StepDescription text={step.description} />}

                {showStepDates && step.createdAt != null && (
                  <StepDates created={Number(step.createdAt)} updated={Number(step.updatedAt)} />
                )}

                <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Step actions">
                  {strip.map((d, i) => {
                    const armed = confirmAction === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        aria-keyshortcuts={String(i + 1)}
                        onClick={() => runAction(d)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 type-label transition-colors",
                          armed
                            ? "bg-destructive/10 text-destructive-ink"
                            : d.key === "postpone" && postponing
                              ? "bg-primary-light text-primary"
                              : "bg-field text-foreground hover:bg-muted"
                        )}
                      >
                        <kbd className="type-kbd text-muted-foreground">{i + 1}</kbd>
                        <span className="flex h-4 w-4 items-center justify-center">{d.icon}</span>
                        {armed ? "Press again to fail" : d.label}
                      </button>
                    );
                  })}
                </div>

                {postponing && (
                  <div
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setPostponing(false);
                      }
                    }}
                  >
                    <PostponeInput
                      onApply={(dueDate) => {
                        setPostponing(false);
                        postponeTo(dueDate);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail dialog: Details (edit form) | Activity (timesheet + audit log) */}
      <StepDialog
        step={step}
        paths={paths}
        open={dialog.open}
        initialTab={dialog.tab}
        addTime={dialog.addTime}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        onSaveEdit={handleSaveEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete step"
        description={`Are you sure you want to delete "${step.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}

/** The description, clamped to four lines when long. */
function StepDescription({ text }: { text: string }) {
  const [full, setFull] = useState(false);
  const long = text.length > 280 || text.split("\n").length > 4;
  return (
    <div>
      <p
        className={cn(
          "type-body text-muted-foreground whitespace-pre-wrap [overflow-wrap:anywhere]",
          long && !full && "line-clamp-4"
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          className="mt-1 type-meta text-primary hover:underline"
        >
          {full ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** Created, and updated when it is meaningfully after creation. */
function StepDates({ created, updated }: { created: number; updated: number }) {
  const showUpdated = Number.isFinite(updated) && updated - created > 60_000;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 type-meta text-muted-foreground">
      <span title={formatAbsoluteDateTime(created)}>Created {formatRelativePast(created)}</span>
      {showUpdated && (
        <>
          <span aria-hidden="true">·</span>
          <span title={formatAbsoluteDateTime(updated)}>Updated {formatRelativePast(updated)}</span>
        </>
      )}
    </div>
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
    prevProps.onToggleTimer === nextProps.onToggleTimer
  );
});
