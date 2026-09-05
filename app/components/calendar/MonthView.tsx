import type { CalendarDay } from "@/hooks/useCalendarEvents";
import { getMonthGrid, getStartOfDay } from "@/lib/calendar-utils";
import { DAY_LABELS as DAY_NAMES } from "@/lib/date-utils";

const EVENT_COLORS: Record<string, string> = {
  due: "bg-primary",
  "due-overdue": "bg-destructive",
  start: "bg-info",
  completed: "bg-success",
  failed: "bg-destructive",
  routine: "bg-routine",
  reminder: "bg-warning",
};

interface MonthViewProps {
  viewDate: Date;
  calendarDays: Map<number, CalendarDay>;
  onDayClick: (date: Date) => void;
}

export default function MonthView({ viewDate, calendarDays, onDayClick }: MonthViewProps) {
  const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const today = new Date();
  const todayTs = getStartOfDay(today);

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-xs font-medium text-muted-foreground py-2">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l border-border">
        {grid.map((date, i) => {
          const ts = getStartOfDay(date);
          const day = calendarDays.get(ts);
          const events = day?.events ?? [];
          const isToday = ts === todayTs;
          const isCurrentMonth = date.getMonth() === viewDate.getMonth();

          // Deduplicate event dots by type
          const dotTypes = new Set<string>();
          for (const e of events) {
            const key = e.type === "due" && e.isOverdue ? "due-overdue" : e.type;
            dotTypes.add(key);
          }
          const dots = Array.from(dotTypes).slice(0, 4);
          const overflow = events.length > 4 ? events.length - 4 : 0;

          return (
            <button
              key={i}
              onClick={() => onDayClick(date)}
              className={`min-h-[80px] md:min-h-[100px] border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/50 cursor-pointer ${
                !isCurrentMonth ? "opacity-40" : ""
              }`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium leading-none ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      : "text-foreground"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Event dots */}
              {dots.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {dots.map((type) => (
                    <div
                      key={type}
                      className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[type] || "bg-muted-foreground"}`}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[9px] text-muted-foreground">+{overflow}</span>
                  )}
                </div>
              )}

              {/* Compact event titles (desktop only, first 2) */}
              <div className="hidden md:block mt-1 space-y-0.5">
                {events.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] leading-tight truncate text-muted-foreground"
                  >
                    {event.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className="text-[10px] text-muted-foreground/60">
                    +{events.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
