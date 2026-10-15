import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { formatDurationHM } from "@/lib/analytics-utils";
import { resolveSlot, shiftEndWithStart, toTimeValue } from "@/lib/time-slot";
import { useClock } from "@/hooks/useClock";

interface TimeSlotEditorProps {
  /** Calendar day the slot belongs to; the clock values are applied to it. */
  day: number;
  initial?: { start: number; end: number };
  /** Where a new slot starts when there is no `initial`. */
  defaultStart?: number;
  onCancel: () => void;
  onSave: (start: number, end: number) => void;
}

/**
 * Edits one time slot in place, inside the log itself.
 *
 * Only the two clock times are editable. Duration is always derived, so the
 * step total stays the sum of its slots and can never be typed into
 * disagreeing with them. Moving the start carries the end with it, so the
 * block keeps its length; editing the end is how the length changes.
 */
export function TimeSlotEditor({
  day,
  initial,
  defaultStart,
  onCancel,
  onSave,
}: TimeSlotEditorProps) {
  const now = useClock();
  const [startValue, setStartValue] = useState(() =>
    toTimeValue(initial?.start ?? defaultStart ?? now - 30 * 60 * 1000)
  );
  const [endValue, setEndValue] = useState(() => toTimeValue(initial?.end ?? now));
  const startRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startRef.current?.focus();
    startRef.current?.select();
  }, []);

  const slot = resolveSlot(day, startValue, endValue);
  const error =
    slot === undefined
      ? "Pick a start and end time"
      : slot.start > now + 60_000
        ? "Starts in the future"
        : slot.end > now + 60_000
          ? "Ends in the future"
          : null;

  // Moving the start carries the end with it, but never past now: the block
  // just gets shorter. A start that is itself in the future still errors.
  const moveStart = (next: string) => {
    setEndValue((end) => {
      const shifted = shiftEndWithStart(startValue, next, end);
      const moved = resolveSlot(day, next, shifted);
      return moved && moved.end > now ? toTimeValue(now) : shifted;
    });
    setStartValue(next);
  };

  const submit = () => {
    if (error || !slot) return;
    onSave(slot.start, slot.end);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const inputClass =
    "min-w-[7.5rem] flex-1 rounded-md border-transparent bg-field px-2 py-1 type-body tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    // data-own-escape: Escape cancels this edit instead of closing the dialog.
    <div data-own-escape className="py-1.5" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2">
        <input
          ref={startRef}
          type="time"
          aria-label="Start time"
          className={inputClass}
          value={startValue}
          onChange={(e) => moveStart(e.target.value)}
        />
        <span className="shrink-0 type-body text-muted-foreground">to</span>
        <input
          type="time"
          aria-label="End time"
          className={inputClass}
          value={endValue}
          onChange={(e) => setEndValue(e.target.value)}
        />
        {/* Fixed width so the fields never shrink; a problem gets its own line. */}
        <span className="w-12 shrink-0 text-right font-mono type-body tabular-nums text-muted-foreground">
          {error ? "" : formatDurationHM(slot!.end - slot!.start)}
        </span>
        <IconButton
          icon={<Check className="w-3.5 h-3.5" />}
          aria-label="Save time slot"
          variant="ghost"
          size="icon-sm"
          disabled={!!error}
          onClick={submit}
        />
        <IconButton
          icon={<X className="w-3.5 h-3.5" />}
          aria-label="Cancel"
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-1 min-h-0 type-meta text-destructive-ink empty:hidden"
      >
        {error}
      </p>
    </div>
  );
}
