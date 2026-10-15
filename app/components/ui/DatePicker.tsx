import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { Popover } from "radix-ui";
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
 *
 * The calendar is a Radix Popover anchored to the field, so Escape and outside
 * clicks close only the calendar, even inside a dialog.
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
    if (open) setOpen(false);
    else inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={rootRef}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn("type-meta text-muted-foreground", disabled && "opacity-70")}
        >
          {label}
        </label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
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
                "h-11 w-full rounded-md bg-field py-2 pl-3 pr-16 type-body text-foreground",
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
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open calendar"
                  disabled={disabled}
                  className={cn(
                    "rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </Popover.Trigger>
            </div>
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={4}
            aria-label="Choose a date"
            // Calendar focuses the selected day itself.
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            // The field is outside the popover but belongs to it: clicking or
            // typing there must not dismiss the calendar.
            onInteractOutside={(e) => {
              if (rootRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
            className={cn(
              "z-50 rounded-md bg-popover p-3 shadow-elev-3",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
          >
            <div className="flex gap-1 pb-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => select(preset.value())}
                  className="flex-1 rounded px-2 py-1 type-meta text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                className="mt-2 w-full rounded px-2 py-1 type-meta text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
