import { useState, useCallback, useEffect } from "react";
import type { Reminder, ReminderRecurrence } from "@/types/index";
import {
  useCreateReminder,
  useUpdateReminder,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/local-mutations";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  MONTH_LABELS as MONTH_NAMES,
  formatDateForInput,
  parseStartDateInput,
} from "@/lib/date-utils";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";

const RECURRENCE_OPTIONS = [
  { value: "yearly", label: "Every year" },
  { value: "once", label: "One time" },
  { value: "monthly", label: "Every month" },
];
const MONTH_OPTIONS = MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }));

export default function QuickCreateReminderDialog({
  open,
  reminder = null,
  onOpenChange,
}: {
  open: boolean;
  reminder?: Reminder | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("yearly");
  const [dateStr, setDateStr] = useState("");
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title);
      setNote(reminder.note ?? "");
      setRecurrence(reminder.recurrence);
      setDateStr(formatDateForInput(reminder.date));
      setMonth(reminder.month ?? 1);
      setDay(reminder.day ?? 1);
    } else {
      const now = new Date();
      setTitle("");
      setNote("");
      setRecurrence("yearly");
      setDateStr("");
      setMonth(now.getMonth() + 1);
      setDay(now.getDate());
    }
  }, [open, reminder]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Give the reminder a title");
      return;
    }
    const date =
      recurrence === "once" ? (dateStr ? parseStartDateInput(dateStr) : undefined) : undefined;
    if (recurrence === "once" && !date) {
      toast.error("Pick a date");
      return;
    }
    const base = {
      title: title.trim(),
      recurrence,
      month: recurrence === "yearly" ? month : undefined,
      day: recurrence === "yearly" || recurrence === "monthly" ? day : undefined,
    };
    try {
      if (reminder) {
        await updateReminder({
          id: reminder._id,
          ...base,
          note: note.trim() ? note.trim() : null,
          date: date ?? null,
          month: base.month ?? null,
          day: base.day ?? null,
        });
        toast.success("Reminder updated");
      } else {
        await createReminder({ ...base, note: note.trim() || undefined, date });
        toast.success("Reminder added");
      }
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: reminder ? "updateReminder" : "createReminder" });
      toast.error("Failed to save reminder");
    }
  }, [
    title,
    note,
    recurrence,
    dateStr,
    month,
    day,
    reminder,
    createReminder,
    updateReminder,
    toast,
    onOpenChange,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" && e.shiftKey && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[28rem] max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{reminder ? "Edit reminder" : "New reminder"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input
            placeholder="e.g. Anniversary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
          />
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          <div className="space-y-1.5">
            <label className="type-label">Repeats</label>
            <Select
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as ReminderRecurrence)}
              options={RECURRENCE_OPTIONS}
            />
          </div>

          {recurrence === "once" && (
            <DatePicker label="Date" value={dateStr} onChange={setDateStr} />
          )}

          {recurrence === "yearly" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="type-label">Month</label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                  options={MONTH_OPTIONS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="type-label">Day</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={day}
                  onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
            </div>
          )}

          {recurrence === "monthly" && (
            <div className="space-y-1.5">
              <label className="type-label">Day of month</label>
              <Input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{reminder ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
