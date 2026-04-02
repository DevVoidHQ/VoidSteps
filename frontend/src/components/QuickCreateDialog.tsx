import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { useCreateStep } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { parseDateInput, parseStartDateInput } from "@/lib/date-utils";
import { Plus } from "lucide-react";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCreateDialog({ open, onOpenChange }: QuickCreateDialogProps) {
  const toast = useToast();
  const { activePaths } = useData();
  const createStepMutation = useCreateStep();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pathId, setPathId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [prioritize, setPrioritize] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setPathId("");
    setDueDate("");
    setStartDate("");
    setPrioritize(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      await createStepMutation({
        title: trimmed,
        description: description.trim() || undefined,
        pathId: pathId || undefined,
        dueDate: parseDateInput(dueDate),
        startDate: parseStartDateInput(startDate),
        prioritizedToday: prioritize,
      });
      toast.success(`Created "${trimmed}"`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: "quickCreate" });
      toast.error("Failed to create step");
    }
  }, [title, description, pathId, dueDate, startDate, prioritize, createStepMutation, toast, resetForm, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea")) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New Step</DialogTitle>
        </DialogHeader>

        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input
            ref={titleRef}
            placeholder="What do you need to do?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />

          <HierarchicalPathSelector
            paths={activePaths || []}
            selectedPathId={pathId || null}
            onChange={(id) => setPathId(id || "")}
            placeholder="Select Path"
            allowEmpty
          />

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
            />
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={prioritize}
              onChange={(e) => setPrioritize(e.target.checked)}
              className="rounded border-input"
            />
            Prioritize for today
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
