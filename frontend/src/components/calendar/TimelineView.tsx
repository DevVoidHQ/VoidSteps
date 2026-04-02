import { useRef, useEffect, useState } from "react";
import type { CalendarDay, CalendarEvent } from "@/hooks/useCalendarEvents";
import { getStartOfDay } from "@/lib/calendar-utils";
import { Badge } from "@/components/ui/Badge";
import { ChevronRight } from "lucide-react";

const EVENT_TYPE_BADGES: Record<string, { variant: "info" | "warning" | "destructive" | "success" | "outline"; label: string }> = {
  due: { variant: "info", label: "Due" },
  start: { variant: "outline", label: "Starts" },
  completed: { variant: "success", label: "Done" },
  failed: { variant: "destructive", label: "Failed" },
  routine: { variant: "outline", label: "Routine" },
};

interface TimelineViewProps {
  calendarDays: Map<number, CalendarDay>;
  onDayClick: (date: Date) => void;
}

function TimelineEvent({ event }: { event: CalendarEvent }) {
  const badgeInfo = EVENT_TYPE_BADGES[event.type] || { variant: "outline" as const, label: event.type };
  const isOverdue = event.type === "due" && event.isOverdue;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
          {event.title}
        </span>
        {event.pathTitle && (
          <span className="text-xs text-muted-foreground ml-2">{event.pathTitle}</span>
        )}
      </div>
      <Badge variant={isOverdue ? "destructive" : badgeInfo.variant} size="sm">
        {isOverdue ? "Overdue" : badgeInfo.label}
      </Badge>
    </div>
  );
}

function summarizeEvents(events: CalendarEvent[]): string {
  const counts: Record<string, number> = {};
  for (const e of events) {
    const key = e.type === "due" && e.isOverdue ? "overdue" : e.type;
    counts[key] = (counts[key] || 0) + 1;
  }

  const parts: string[] = [];
  if (counts.overdue) parts.push(`${counts.overdue} overdue`);
  if (counts.due) parts.push(`${counts.due} due`);
  if (counts.start) parts.push(`${counts.start} starting`);
  if (counts.routine) parts.push(`${counts.routine} routine${counts.routine > 1 ? "s" : ""}`);
  if (counts.completed) parts.push(`${counts.completed} done`);
  if (counts.failed) parts.push(`${counts.failed} failed`);

  return parts.join(" · ");
}

function TimelineDayNode({ day, isToday, isPast, todayRef }: {
  day: CalendarDay;
  isToday: boolean;
  isPast: boolean;
  todayRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      key={day.timestamp}
      ref={isToday ? todayRef : undefined}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
          isPast && !isToday ? "opacity-60" : ""
        }`}
      >
        <ChevronRight
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {isToday && (
            <Badge variant="default" size="sm">Today</Badge>
          )}
          <span
            className={`text-sm font-semibold ${
              isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {day.date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {summarizeEvents(day.events)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {day.events.length} item{day.events.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Expanded detail — only when open */}
      {isOpen && (
        <div className={`ml-9 mt-1 mb-2 rounded-lg border border-border bg-card/50 px-4 py-2 ${isPast && !isToday ? "opacity-60" : ""}`}>
          {day.events.map((event) => (
            <TimelineEvent key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimelineView({ calendarDays }: TimelineViewProps) {
  const todayRef = useRef<HTMLDivElement | null>(null);
  const todayTs = getStartOfDay(new Date());

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const sortedDays = Array.from(calendarDays.values())
    .filter((d) => d.events.length > 0)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (sortedDays.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No events in the visible range
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedDays.map((day) => (
        <TimelineDayNode
          key={day.timestamp}
          day={day}
          isToday={day.timestamp === todayTs}
          isPast={day.timestamp < todayTs}
          todayRef={todayRef}
        />
      ))}
    </div>
  );
}
