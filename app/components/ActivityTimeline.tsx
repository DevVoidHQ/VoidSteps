import { useClock } from "@/hooks/useClock";
import { useMemo, useRef, useState } from "react";
import type { Step, Path } from "@/types/index";
import type { LocalActivityEvent, LocalTimeEntry } from "@/lib/db";
import { useStepTimesheet } from "@/hooks/useTimesheet";
import { useAddTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from "@/lib/local-mutations";
import { buildActivityFeed, formatClock } from "@/lib/timesheet-utils";
import { formatDurationHM } from "@/lib/analytics-utils";
import { useElapsedTime } from "@/hooks/useTimer";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TimeSlotEditor } from "@/components/TimeSlotEditor";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  StarOff,
  Target,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";

interface ActivityTimelineProps {
  step: Step;
  paths: Path[];
  /** Start with a new block open for today, focused and ready to type. */
  autoAdd?: boolean;
}

function formatDay(dayStart: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - dayStart) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const d = new Date(dayStart);
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatDateValue(value: unknown): string {
  if (typeof value !== "number") return "none";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Icon + human sentence for one audit event. */
function describeEvent(
  event: LocalActivityEvent,
  pathsById: Map<string, Path>
): { icon: React.ReactNode; text: string } {
  const iconCls = "w-3.5 h-3.5";
  switch (event.type) {
    case "completed":
      return { icon: <Check className={`${iconCls} text-accent-ink`} />, text: "Completed" };
    case "uncompleted":
      return { icon: <RotateCcw className={iconCls} />, text: "Reopened" };
    case "failed":
      return {
        icon: <XCircle className={`${iconCls} text-destructive-ink`} />,
        text: "Marked failed",
      };
    case "unfailed":
      return { icon: <XCircle className={iconCls} />, text: "Unmarked failed" };
    case "archived":
      return { icon: <Archive className={iconCls} />, text: "Archived" };
    case "unarchived":
      return { icon: <ArchiveRestore className={iconCls} />, text: "Restored from archive" };
    case "time_adjusted":
      return {
        icon: <Clock className={iconCls} />,
        text: `Tracked time set to ${formatDurationHM(typeof event.newValue === "number" ? event.newValue : 0)}`,
      };
    case "field_changed":
      switch (event.field) {
        case "title":
          return {
            icon: <Pencil className={iconCls} />,
            text: `Renamed to “${event.newValue ?? ""}”`,
          };
        case "description":
          return { icon: <Pencil className={iconCls} />, text: "Description updated" };
        case "dueDate":
          return {
            icon: <Calendar className={iconCls} />,
            text:
              event.newValue == null
                ? "Due date removed"
                : event.oldValue == null
                  ? `Due date set to ${formatDateValue(event.newValue)}`
                  : `Due date: ${formatDateValue(event.oldValue)} → ${formatDateValue(event.newValue)}`,
          };
        case "startDate":
          return {
            icon: <CalendarClock className={iconCls} />,
            text:
              event.newValue == null
                ? "Defer date removed"
                : event.oldValue == null
                  ? `Deferred until ${formatDateValue(event.newValue)}`
                  : `Defer date: ${formatDateValue(event.oldValue)} → ${formatDateValue(event.newValue)}`,
          };
        case "pathId": {
          const title =
            typeof event.newValue === "string" ? pathsById.get(event.newValue)?.title : undefined;
          return {
            icon: <Target className={iconCls} />,
            text:
              event.newValue == null
                ? "Removed from its path"
                : `Moved to ${title ?? "another path"}`,
          };
        }
        case "prioritizedToday":
          return event.newValue === true
            ? {
                icon: <Star className={`${iconCls} text-primary`} />,
                text: "Prioritized for today",
              }
            : { icon: <StarOff className={iconCls} />, text: "Priority removed" };
        default:
          return { icon: <Pencil className={iconCls} />, text: "Updated" };
      }
    default:
      return { icon: <Pencil className={iconCls} />, text: "Updated" };
  }
}

function RunningRow({ startedAt }: { startedAt: number }) {
  const elapsed = useElapsedTime(startedAt, 0);
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="type-label text-foreground">{formatClock(startedAt)} to now</span>
      <span className="ml-auto font-mono type-body tabular-nums text-primary">{elapsed}</span>
    </div>
  );
}

export function ActivityTimeline({ step, paths, autoAdd = false }: ActivityTimelineProps) {
  const toast = useToast();
  const { entries, events } = useStepTimesheet(step._id);
  const addTimeEntry = useAddTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  // Editing happens in place, in this list. `adding` holds the day a new slot
  // is being added to, so the clock values land on the right date.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(() =>
    autoAdd ? new Date().setHours(0, 0, 0, 0) : null
  );
  const [deleteTarget, setDeleteTarget] = useState<LocalTimeEntry | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pathsById = useMemo(() => new Map(paths.map((p) => [p._id, p])), [paths]);

  const now = useClock();
  const groups = useMemo(() => {
    if (!entries || !events) return undefined;
    return buildActivityFeed(
      {
        _id: step._id,
        createdAt: Number(step.createdAt) || 0,
        completedAt: step.completedAt ? Number(step.completedAt) : undefined,
        completed: step.completed,
        routineId: step.routineId,
        timerStartedAt: step.timerStartedAt,
        totalTimeSpentMs: step.totalTimeSpentMs,
      },
      entries,
      events,
      now
    );
  }, [entries, events, step, now]);

  const handleSaveSlot = async (id: string | null, start: number, end: number) => {
    try {
      if (id) await updateTimeEntry({ id, start, end });
      else await addTimeEntry({ stepId: step._id, start, end });
      setEditingId(null);
      setAdding(null);
    } catch (e) {
      reportError("mutation", e, {
        action: id ? "updateTimeEntry" : "addTimeEntry",
        stepId: step._id,
      });
      toast.error("Failed to save time slot");
    }
  };

  // Arrow keys walk the slot rows. They are the only rows you can act on, so
  // moving between them is the whole navigation model for this panel.
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-slot-row]") ?? []
    );
    if (rows.length === 0) return;
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    e.preventDefault();
    const next = e.key === "ArrowDown" ? at + 1 : at - 1;
    rows[Math.max(0, Math.min(rows.length - 1, next))]?.focus();
  };

  const handleDeleteEntry = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTimeEntry({ id: deleteTarget._id });
      toast.success("Time entry deleted");
    } catch (e) {
      reportError("mutation", e, { action: "deleteTimeEntry", stepId: step._id });
      toast.error("Failed to delete time entry");
    }
  };

  // A new block starts where the last one today ended, so logging a day is
  // mostly typing the end time. Otherwise it defaults to the last half hour.
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const lastEndToday = (entries ?? [])
    .filter((e) => e.end >= todayStart && e.end < now)
    .reduce<number | undefined>((latest, e) => Math.max(latest ?? 0, e.end), undefined);

  if (!groups) return null;

  const hasAnything = groups.some((g) => g.items.length > 0);

  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingId(null);
            setAdding(new Date().setHours(0, 0, 0, 0));
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add time slot
        </Button>
      </div>

      {adding !== null && (
        <TimeSlotEditor
          day={adding}
          defaultStart={lastEndToday}
          onCancel={() => setAdding(null)}
          onSave={(start, end) => handleSaveSlot(null, start, end)}
        />
      )}

      {!hasAnything ? (
        <EmptyState
          icon={History}
          message="No activity yet"
          hint="Press play to start tracking, or add a time slot"
        />
      ) : (
        <div ref={listRef} onKeyDown={handleListKeyDown} className="space-y-3">
          {groups.map((group) => (
            <div key={group.dayStart}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-card py-1">
                <span className="type-overline text-muted-foreground">
                  {formatDay(group.dayStart)}
                </span>
                {group.trackedMs > 0 && (
                  <span className="type-meta text-muted-foreground">
                    {formatDurationHM(group.trackedMs)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {group.items.map((item, i) => {
                  if (item.kind === "running") {
                    return <RunningRow key={`running-${i}`} startedAt={item.startedAt} />;
                  }
                  if (item.kind === "entry") {
                    const e = item.entry;
                    if (editingId === e._id) {
                      return (
                        <TimeSlotEditor
                          key={e._id}
                          day={group.dayStart}
                          initial={{ start: e.start, end: e.end }}
                          onCancel={() => setEditingId(null)}
                          onSave={(start, end) => handleSaveSlot(e._id, start, end)}
                        />
                      );
                    }
                    return (
                      <div
                        key={e._id}
                        data-slot-row
                        tabIndex={0}
                        role="button"
                        aria-label={`Time slot ${formatClock(e.start)} to ${formatClock(e.end)}, ${formatDurationHM(e.durationMs)}. Enter to edit.`}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.preventDefault();
                            setAdding(null);
                            setEditingId(e._id);
                          } else if (ev.key === "Delete" || ev.key === "Backspace") {
                            ev.preventDefault();
                            setDeleteTarget(e);
                          }
                        }}
                        onClick={() => {
                          setAdding(null);
                          setEditingId(e._id);
                        }}
                        className="group/entry flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="type-body text-foreground">
                          {formatClock(e.start)} to {formatClock(e.end)}
                        </span>
                        {e.source === "manual" && (
                          <span className="type-overline text-muted-foreground">manual</span>
                        )}
                        <span className="ml-auto font-mono type-body tabular-nums text-muted-foreground">
                          {formatDurationHM(e.durationMs)}
                        </span>
                        <span className="inline-flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/entry:opacity-100">
                          <IconButton
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            aria-label="Edit time entry"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setAdding(null);
                              setEditingId(e._id);
                            }}
                          />
                          <IconButton
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            aria-label="Delete time entry"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setDeleteTarget(e);
                            }}
                          />
                        </span>
                      </div>
                    );
                  }
                  if (item.kind === "created") {
                    return (
                      <div
                        key={`created-${i}`}
                        className="flex items-center gap-2.5 py-1.5 text-muted-foreground"
                      >
                        {item.viaRoutine ? (
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="type-body">
                          {item.viaRoutine ? "Created by routine" : "Created"}
                        </span>
                        <span className="ml-auto type-meta">{formatClock(item.at)}</span>
                      </div>
                    );
                  }
                  if (item.kind === "legacy-time") {
                    return (
                      <div
                        key={`legacy-${i}`}
                        className="flex items-center gap-2.5 py-1.5 text-muted-foreground"
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span className="type-body">
                          {formatDurationHM(item.ms)} tracked before session history
                        </span>
                      </div>
                    );
                  }
                  const { icon, text } = describeEvent(item.event, pathsById);
                  return (
                    <div
                      key={item.event._id}
                      className="flex items-center gap-2.5 py-1.5 text-muted-foreground"
                    >
                      <span className="shrink-0">{icon}</span>
                      <span className="type-body">{text}</span>
                      <span className="ml-auto type-meta">{formatClock(item.at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete time entry"
        description={
          deleteTarget
            ? `Remove the ${formatDurationHM(deleteTarget.durationMs)} entry from ${formatClock(deleteTarget.start)}? Its time is subtracted from the step's total.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteEntry}
      />
    </div>
  );
}
