import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { addDays, addMonths, getMonthGrid, getMonthLabel, isSameDay } from "@/lib/calendar-utils";
import { formatDateForInput, parseStartDateInput } from "@/lib/date-utils";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface CalendarProps {
  /** Selected day as YYYY-MM-DD, or empty for none. */
  value: string;
  onSelect: (value: string) => void;
  /** Moves focus into the grid on mount, for popover use. */
  autoFocus?: boolean;
  className?: string;
}

/** The selected day, or today when nothing is selected yet. */
function anchorDate(value: string): Date {
  const timestamp = parseStartDateInput(value);
  return timestamp === undefined ? new Date() : new Date(timestamp);
}

/** Splits the flat month grid into weeks. */
function toWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/**
 * Month grid with full keyboard navigation. Shares getMonthGrid with the
 * calendar views so a week here starts on the same day it does there.
 */
export function Calendar({ value, onSelect, autoFocus, className }: CalendarProps) {
  const [focusDate, setFocusDate] = React.useState(() => anchorDate(value));
  const focusedRef = React.useRef<HTMLButtonElement>(null);
  const pendingFocusRef = React.useRef(Boolean(autoFocus));

  // Follow the value when it changes from outside (presets, typing).
  React.useEffect(() => {
    if (value) setFocusDate(anchorDate(value));
  }, [value]);

  // Only steal focus for keyboard moves, never on every render.
  React.useEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    focusedRef.current?.focus();
  }, [focusDate]);

  const today = new Date();
  const selected = value ? anchorDate(value) : undefined;
  const weeks = toWeeks(getMonthGrid(focusDate.getFullYear(), focusDate.getMonth()));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      Home: () => addDays(focusDate, -focusDate.getDay()),
      End: () => addDays(focusDate, 6 - focusDate.getDay()),
      PageUp: () => addMonths(focusDate, -1),
      PageDown: () => addMonths(focusDate, 1),
    };

    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      pendingFocusRef.current = true;
      setFocusDate(move());
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(formatDateForInput(focusDate.getTime()));
    }
  };

  return (
    <div className={cn("w-[17.5rem] select-none", className)}>
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setFocusDate(addMonths(focusDate, -1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div aria-live="polite" className="type-label">
          {getMonthLabel(focusDate)}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setFocusDate(addMonths(focusDate, 1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-1 text-center type-meta text-muted-foreground">
            {name}
          </div>
        ))}
      </div>

      <div role="grid" aria-label={getMonthLabel(focusDate)} onKeyDown={handleKeyDown}>
        {weeks.map((week) => (
          <div key={week[0].getTime()} role="row" className="grid grid-cols-7 gap-0.5">
            {week.map((date) => {
              const isFocused = isSameDay(date, focusDate);
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, today);
              const isOutside = date.getMonth() !== focusDate.getMonth();

              return (
                <button
                  key={date.getTime()}
                  ref={isFocused ? focusedRef : undefined}
                  type="button"
                  role="gridcell"
                  tabIndex={isFocused ? 0 : -1}
                  aria-label={date.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => onSelect(formatDateForInput(date.getTime()))}
                  className={cn(
                    "relative h-9 rounded-md type-body transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isOutside && "text-muted-foreground/50",
                    !isSelected && "hover:bg-muted",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                    isToday && !isSelected && "font-semibold text-primary"
                  )}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
