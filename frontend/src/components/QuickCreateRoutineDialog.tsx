import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { useCreateRoutine } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { Plus } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface QuickCreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCreateRoutineDialog({ open, onOpenChange }: QuickCreateRoutineDialogProps) {
  const toast = useToast();
  const { activePaths } = useData();
  const createRoutineMutation = useCreateRoutine();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pathId, setPathId] = useState("");
  const [frequency, setFrequency] = useState<string>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]); // Monday default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [month, setMonth] = useState(1);
  const [dayOfYear, setDayOfYear] = useState(1);
  const [autoPrioritize, setAutoPrioritize] = useState(true);

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle(""); setDescription(""); setPathId(""); setFrequency("daily");
    setDaysOfWeek([1]); setDayOfMonth(1); setMonth(1); setDayOfYear(1); setAutoPrioritize(true);
  }, []);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
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
      resetForm();
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: "quickCreateRoutine" });
      toast.error("Failed to create routine");
    }
  }, [title, description, pathId, frequency, daysOfWeek, dayOfMonth, month, dayOfYear, autoPrioritize, createRoutineMutation, toast, resetForm, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    else if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea, select")) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>New Routine</DialogTitle></DialogHeader>
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input ref={titleRef} placeholder="Routine title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          <HierarchicalPathSelector paths={activePaths || []} selectedPathId={pathId || null} onChange={(id) => setPathId(id || "")} placeholder="Select Path" allowEmpty />

          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Weekly: day selection */}
          {frequency === "weekly" && (
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${daysOfWeek.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Monthly: day of month */}
          {frequency === "monthly" && (
            <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          )}

          {/* Yearly: month + day */}
          {frequency === "yearly" && (
            <div className="grid grid-cols-2 gap-3">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {MONTH_LABELS.map((label, i) => (
                  <option key={i + 1} value={i + 1}>{label}</option>
                ))}
              </select>
              <select value={dayOfYear} onChange={(e) => setDayOfYear(Number(e.target.value))}
                className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={autoPrioritize} onChange={(e) => setAutoPrioritize(e.target.checked)} className="rounded border-input" />
            Add to Today's Focus when spawned
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}><Plus className="w-4 h-4 mr-2" />Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
