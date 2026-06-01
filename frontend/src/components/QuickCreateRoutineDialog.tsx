import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { useCreateRoutine, useUpdateRoutine, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import type { Routine } from "@/types";
import { Plus, Check } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface QuickCreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this routine instead of creating one. */
  routine?: Routine | null;
}

export default function QuickCreateRoutineDialog({ open, onOpenChange, routine }: QuickCreateRoutineDialogProps) {
  const toast = useToast();
  const { activePaths } = useData();
  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const titleRef = useRef<HTMLInputElement>(null);
  const isEditing = !!routine;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pathId, setPathId] = useState("");
  const [frequency, setFrequency] = useState<string>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]); // Monday default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [month, setMonth] = useState(1);
  const [dayOfYear, setDayOfYear] = useState(1);
  const [autoPrioritize, setAutoPrioritize] = useState(true);

  const resetForm = useCallback(() => {
    setTitle(""); setDescription(""); setPathId(""); setFrequency("daily");
    setDaysOfWeek([1]); setDayOfMonth(1); setMonth(1); setDayOfYear(1); setAutoPrioritize(true);
  }, []);

  // Prefill from the routine being edited (or reset to defaults) when opened.
  useEffect(() => {
    if (!open) return;
    if (routine) {
      setTitle(routine.title ?? "");
      setDescription(routine.description ?? "");
      setPathId(routine.path?._id ?? (typeof routine.pathId === "string" ? routine.pathId : "") ?? "");
      setFrequency(routine.frequency ?? "daily");
      setDaysOfWeek(routine.daysOfWeek ?? [1]);
      setDayOfMonth(routine.dayOfMonth ?? 1);
      setMonth(routine.month ?? 1);
      setDayOfYear(routine.dayOfYear ?? 1);
      setAutoPrioritize(routine.autoPrioritize ?? true);
    } else {
      resetForm();
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [open, routine, resetForm]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      if (routine) {
        // Edit: null clears the field server-side when not applicable.
        await updateRoutineMutation({
          id: routine._id,
          title: trimmed,
          description: description.trim() || undefined,
          pathId: pathId || null,
          frequency: frequency as any,
          daysOfWeek: frequency === "weekly" ? daysOfWeek : null,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
          month: frequency === "yearly" ? month : null,
          dayOfYear: frequency === "yearly" ? dayOfYear : null,
          autoPrioritize,
        });
        toast.success(`Updated routine "${trimmed}"`);
      } else {
        await createRoutineMutation({
          title: trimmed,
          description: description.trim() || undefined,
          pathId: pathId || undefined,
          frequency: frequency as any,
          daysOfWeek: frequency === "weekly" ? daysOfWeek : undefined,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
          month: frequency === "yearly" ? month : undefined,
          dayOfYear: frequency === "yearly" ? dayOfYear : undefined,
          autoPrioritize,
        });
        toast.success(`Created routine "${trimmed}"`);
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: routine ? "editRoutine" : "quickCreateRoutine" });
      toast.error(routine ? "Failed to update routine" : "Failed to create routine");
    }
  }, [routine, title, description, pathId, frequency, daysOfWeek, dayOfMonth, month, dayOfYear, autoPrioritize, createRoutineMutation, updateRoutineMutation, toast, resetForm, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    else if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea, select, button, [role=listbox], [role=option]")) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit Routine" : "New Routine"}</DialogTitle></DialogHeader>
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input ref={titleRef} placeholder="Routine title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE_LENGTH} />
          <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={MAX_DESCRIPTION_LENGTH}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          <HierarchicalPathSelector paths={activePaths || []} selectedPathId={pathId || null} onChange={(id) => setPathId(id || "")} placeholder="Select Path" allowEmpty />

          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v)}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekdays", label: "Weekdays" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </div>

          {/* Weekly: day selection */}
          {frequency === "weekly" && (
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${daysOfWeek.includes(i) ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Monthly: day of month */}
          {frequency === "monthly" && (
            <Select
              value={String(dayOfMonth)}
              onValueChange={(v) => setDayOfMonth(Number(v))}
              options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))}
            />
          )}

          {/* Yearly: month + day */}
          {frequency === "yearly" && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                options={MONTH_LABELS.map((label, i) => ({ value: String(i + 1), label }))}
              />
              <Select
                value={String(dayOfYear)}
                onValueChange={(v) => setDayOfYear(Number(v))}
                options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))}
              />
            </div>
          )}

          <Toggle
            size="sm"
            checked={autoPrioritize}
            onChange={(e) => setAutoPrioritize(e.target.checked)}
            label="Add to Today's Focus when created"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {isEditing ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
