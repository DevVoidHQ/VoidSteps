import { useClock } from "@/hooks/useClock";
import { useMemo, useState } from "react";
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
import { TimeEntryDialog } from "@/components/TimeEntryDialog";
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
      return { icon: <Check className={`${iconCls} text-accent`} />, text: "Completed" };
    case "uncompleted":
      return { icon: <RotateCcw className={iconCls} />, text: "Reopened" };
    case "failed":
      return { icon: <XCircle className={`${iconCls} text-destructive`} />, text: "Marked failed" };
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
      <span className="text-sm font-medium text-foreground">{formatClock(startedAt)} to now</span>
      <span className="ml-auto font-mono text-sm tabular-nums text-primary">{elapsed}</span>
    </div>
  );
}

export function ActivityTimeline({ step, paths }: ActivityTimelineProps) {
  const toast = useToast();
  const { entries, events } = useStepTimesheet(step._id);
  const addTimeEntry = useAddTimeEntry();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  const [entryDialog, setEntryDialog] = useState<{ open: boolean; entry?: LocalTimeEntry }>({
    open: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<LocalTimeEntry | null>(null);

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

  const handleSubmitEntry = async (start: number, end: number) => {
    try {
      if (entryDialog.entry) await updateTimeEntry({ id: entryDialog.entry._id, start, end });
      else await addTimeEntry({ stepId: step._id, start, end });
    } catch (e) {
      reportError("mutation", e, {
        action: entryDialog.entry ? "updateTimeEntry" : "addTimeEntry",
        stepId: step._id,
      });
      toast.error("Failed to save time entry");
    }
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

  if (!groups) return null;

  const hasAnything = groups.some((g) => g.items.length > 0);

  return (
    <div className="space-y-1">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEntryDialog({ open: true })}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add time entry
        </Button>
      </div>

      {!hasAnything ? (
        <EmptyState
          icon={History}
          message="No activity yet"
          hint="Press play to start tracking, or add time manually"
        />
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto scrollbar-hide pr-1">
          {groups.map((group) => (
            <div key={group.dayStart}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-card py-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatDay(group.dayStart)}
                </span>
                {group.trackedMs > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDurationHM(group.trackedMs)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border/50">
                {group.items.map((item, i) => {
                  if (item.kind === "running") {
                    return <RunningRow key={`running-${i}`} startedAt={item.startedAt} />;
                  }
                  if (item.kind === "entry") {
                    const e = item.entry;
                    return (
                      <div key={e._id} className="group/entry flex items-center gap-2.5 py-1.5">
                        <Timer className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {formatClock(e.start)} to {formatClock(e.end)}
                        </span>
                        {e.source === "manual" && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            manual
                          </span>
                        )}
                        <span className="ml-auto font-mono text-sm tabular-nums text-muted-foreground">
                          {formatDurationHM(e.durationMs)}
                        </span>
                        <span className="hidden shrink-0 items-center group-hover/entry:inline-flex">
                          <IconButton
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            aria-label="Edit time entry"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEntryDialog({ open: true, entry: e })}
                          />
                          <IconButton
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            aria-label="Delete time entry"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(e)}
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
                        <span className="text-sm">
                          {item.viaRoutine ? "Created by routine" : "Created"}
                        </span>
                        <span className="ml-auto text-xs">{formatClock(item.at)}</span>
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
                        <span className="text-sm">
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
                      <span className="text-sm">{text}</span>
                      <span className="ml-auto text-xs">{formatClock(item.at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TimeEntryDialog
        open={entryDialog.open}
        onOpenChange={(open) => setEntryDialog((prev) => ({ ...prev, open }))}
        initial={
          entryDialog.entry
            ? { start: entryDialog.entry.start, end: entryDialog.entry.end }
            : undefined
        }
        onSubmit={handleSubmitEntry}
      />

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
