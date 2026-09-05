import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Calendar } from "@/components/ui/Calendar";
import { addDays } from "@/lib/calendar-utils";
import { formatDateDisplay, formatDateForInput, parseLooseDate } from "@/lib/date-utils";

interface DatePickerProps {
  label?: string;
  /** YYYY-MM-DD, empty string for no date. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

interface Preset {
  label: string;
  value: () => string;
}

const PRESETS: Preset[] = [
  { label: "Today", value: () => formatDateForInput(Date.now()) },
  { label: "Tomorrow", value: () => formatDateForInput(addDays(new Date(), 1).getTime()) },
  { label: "Next week", value: () => formatDateForInput(addDays(new Date(), 7).getTime()) },
];

/**
 * Themed date field: a readable text input backed by a popover calendar, so it
 * matches the app instead of handing over to the OS date widget. The value
 * contract is still YYYY-MM-DD.
 */
export function DatePicker({
  label,
  value,
  onChange,
  className,
  disabled,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const inputId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close the popover without also closing the surrounding dialog.
      e.stopPropagation();
      setOpen(false);
      inputRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const commitDraft = () => {
    if (draft === null) return;
    const text = draft.trim();
    // Clearing the field clears the date; anything unparseable reverts.
    if (!text) onChange("");
    else {
      const parsed = parseLooseDate(text);
      if (parsed) onChange(parsed);
    }
    setDraft(null);
  };

  const select = (next: string) => {
    onChange(next);
    setDraft(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={rootRef}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn("text-xs text-muted-foreground", disabled && "opacity-70")}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={draft ?? (focused ? value : formatDateDisplay(value))}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              setOpen(false);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            "h-11 w-full rounded-md border border-input bg-background py-2 pl-3 pr-16 text-sm text-foreground",
            "ring-offset-background transition-colors duration-150 placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              aria-label="Clear date"
              onClick={() => select("")}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Open calendar"
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div
            role="dialog"
            aria-label="Choose a date"
            className={cn(
              "absolute right-0 z-50 mt-1 rounded-md border border-border bg-background p-3 shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
          >
            <div className="flex gap-1 pb-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => select(preset.value())}
                  className="flex-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <Calendar value={value} onSelect={select} autoFocus />

            {value && (
              <button
                type="button"
                onClick={() => select("")}
                className="mt-2 w-full rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
