import type { Step, Path } from "@/types";
import type { CalendarDay, CalendarEvent } from "@/hooks/useCalendarEvents";
import { getStartOfDay } from "@/lib/calendar-utils";
import { StepCard } from "@/components/StepCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays, AlertCircle, PlayCircle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export interface StepActions {
  onToggle: (id: string) => void;
  onToggleFailed: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onToggleTimer: (id: string) => void;
  activeTimerStepId: string | null;
  onSetTotalTime: (id: string, totalTimeSpentMs: number) => void;
  paths: Path[];
}

interface DayDetailPanelProps {
  date: Date;
  calendarDays: Map<number, CalendarDay>;
  stepActions: StepActions;
}

function EventSection({
  title,
  icon: Icon,
  events,
  stepActions,
  variant = "default",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  events: CalendarEvent[];
  stepActions: StepActions;
  variant?: "default" | "destructive" | "muted";
}) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3
        className={`text-sm font-medium flex items-center gap-2 ${
          variant === "destructive"
            ? "text-destructive"
            : variant === "muted"
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        <Icon className="w-4 h-4" />
        {title} ({events.length})
      </h3>
      <div className="space-y-2">
        {events.map((event) =>
          event.step ? (
            <StepCard
              key={event.id}
              step={event.step}
              paths={stepActions.paths}
              onToggle={() => stepActions.onToggle(event.step!._id)}
              onToggleFailed={() => stepActions.onToggleFailed(event.step!._id)}
              onDelete={() => stepActions.onDelete(event.step!._id)}
              onSaveEdit={(id, updates) => stepActions.onSaveEdit(id, updates)}
              onTogglePriority={() =>
                stepActions.onTogglePriority(event.step!._id, event.step!.prioritizedToday)
              }
              onToggleTimer={() => stepActions.onToggleTimer(event.step!._id)}
              activeTimerStepId={stepActions.activeTimerStepId}
              onSetTotalTime={(id, ms) => stepActions.onSetTotalTime(id, ms)}
            />
          ) : (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30"
            >
              <RefreshCw className="w-4 h-4 text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{event.title}</span>
                {event.pathTitle && (
                  <span className="text-xs text-muted-foreground">{event.pathTitle}</span>
                )}
              </div>
              <Badge variant="outline" size="sm">
                Scheduled
              </Badge>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function DayDetailPanel({ date, calendarDays, stepActions }: DayDetailPanelProps) {
  const ts = getStartOfDay(date);
  const day = calendarDays.get(ts);
  const events = day?.events ?? [];

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        message="Nothing scheduled for this day"
        hint="Steps with due dates or start dates will appear here"
      />
    );
  }

  const overdueEvents = events.filter((e) => e.type === "due" && e.isOverdue);
  const dueEvents = events.filter((e) => e.type === "due" && !e.isOverdue);
  const startEvents = events.filter((e) => e.type === "start");
  const routineEvents = events.filter((e) => e.type === "routine");
  const completedEvents = events.filter((e) => e.type === "completed");
  const failedEvents = events.filter((e) => e.type === "failed");

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
      <EventSection title="Overdue" icon={AlertCircle} events={overdueEvents} stepActions={stepActions} variant="destructive" />
      <EventSection title="Due" icon={CalendarDays} events={dueEvents} stepActions={stepActions} />
      <EventSection title="Starting" icon={PlayCircle} events={startEvents} stepActions={stepActions} />
      <EventSection title="Routines" icon={RefreshCw} events={routineEvents} stepActions={stepActions} />
      <EventSection title="Completed" icon={CheckCircle2} events={completedEvents} stepActions={stepActions} variant="muted" />
      <EventSection title="Failed" icon={XCircle} events={failedEvents} stepActions={stepActions} variant="destructive" />
    </div>
  );
}
