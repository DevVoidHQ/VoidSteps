import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { formatDurationHM } from "@/lib/analytics-utils";
import { toDateTimeLocal, fromDateTimeLocal } from "@/lib/timesheet-utils";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing interval when set; adding a manual one otherwise. */
  initial?: { start: number; end: number };
  onSubmit: (start: number, end: number) => void;
}

/** Add or edit one time interval (start + end, local time). */
export function TimeEntryDialog({ open, onOpenChange, initial, onSubmit }: TimeEntryDialogProps) {
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const end = initial?.end ?? Date.now();
    const start = initial?.start ?? end - 30 * 60 * 1000;
    setStartValue(toDateTimeLocal(start));
    setEndValue(toDateTimeLocal(end));
    // Depend on the primitive bounds, not the object identity: callers build
    // `initial` inline, and a parent that re-renders every second (running
    // timer tick) would otherwise re-seed the form and clobber user input.
  }, [open, initial?.start, initial?.end]);

  const start = fromDateTimeLocal(startValue);
  const end = fromDateTimeLocal(endValue);
  const now = Date.now();
  const error =
    start === undefined || end === undefined
      ? "Pick a start and end time"
      : end <= start
        ? "End must be after start"
        : start > now
          ? "Start can't be in the future"
          : end > now + 60_000
            ? "End can't be in the future"
            : null;

  const handleSubmit = () => {
    if (error || start === undefined || end === undefined) return;
    onSubmit(start, end);
    onOpenChange(false);
  };

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit time entry" : "Add time entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={endValue}
              onChange={(e) => setEndValue(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Duration: {formatDurationHM((end ?? 0) - (start ?? 0))}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!!error}>
            {initial ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
