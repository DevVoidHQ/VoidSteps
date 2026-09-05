import { useState, useCallback, useEffect } from "react";
import type { Step, Path } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { DatePicker } from "@/components/ui/DatePicker";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/local-mutations";
import { formatDateForInput, parseDateInput, parseStartDateInput } from "@/lib/date-utils";
import { useDeferDatesMode, useDueDatesMode } from "@/lib/preferences";

export type StepDialogTab = "details" | "activity";

export interface StepDialogProps {
  step: Step;
  paths: Path[];
  open: boolean;
  initialTab?: StepDialogTab;
  onOpenChange: (open: boolean) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
}

/**
 * The step's detail surface: Details (edit form, formerly StepCard's inline
 * edit dialog) + Activity (per-session time entries and the audit timeline).
 */
export function StepDialog({
  step,
  paths,
  open,
  initialTab = "details",
  onOpenChange,
  onSaveEdit,
}: StepDialogProps) {
  const deferEnabled = useDeferDatesMode() !== "off";
  const dueEnabled = useDueDatesMode() !== "off";

  const [tab, setTab] = useState<StepDialogTab>(initialTab);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    pathId: "",
    dueDate: "",
    startDate: "",
  });

  // Re-seed the form (and tab) each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setEditForm({
      title: step.title,
      description: step.description || "",
      pathId:
        typeof step.pathId === "object" && step.pathId
          ? step.pathId._id
          : (step.pathId as unknown as string) || "",
      dueDate: formatDateForInput(step.dueDate),
      startDate: formatDateForInput(step.startDate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFormChange = useCallback(
    (updates: Partial<typeof editForm>) => setEditForm((prev) => ({ ...prev, ...updates })),
    []
  );

  const handleSave = useCallback(() => {
    onSaveEdit(step._id, {
      title: editForm.title,
      description: editForm.description,
      // '' (no path selected) must reach the mutation as null-to-clear, never
      // as an empty-string id.
      pathId: (editForm.pathId || null) as unknown as Path | null,
      dueDate: parseDateInput(editForm.dueDate),
      startDate: parseStartDateInput(editForm.startDate),
    });
    onOpenChange(false);
  }, [step._id, editForm, onSaveEdit, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        !(e.target as HTMLElement).matches("textarea, button, [role=listbox], [role=option]")
      ) {
        if (!editForm.title.trim()) return;
        e.preventDefault();
        handleSave();
      }
    },
    [editForm.title, handleSave]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="[overflow-wrap:anywhere] pr-6">{step.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" value={tab} onValueChange={(v) => setTab(v as StepDialogTab)}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="space-y-3" onKeyDown={handleKeyDown}>
              <Input
                placeholder="Step title"
                value={editForm.title}
                onChange={(e) => handleFormChange({ title: e.target.value })}
                maxLength={MAX_TITLE_LENGTH}
              />
              <Input
                placeholder="Description (optional)"
                value={editForm.description}
                onChange={(e) => handleFormChange({ description: e.target.value })}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <HierarchicalPathSelector
                paths={paths || []}
                selectedPathId={editForm.pathId || null}
                onChange={(id) => handleFormChange({ pathId: id || "" })}
                placeholder="No path"
                allowEmpty={true}
              />
              {(dueEnabled || step.dueDate || deferEnabled || step.startDate) && (
                <div className="flex gap-2">
                  {(dueEnabled || step.dueDate) && (
                    <DatePicker
                      label="Due date"
                      value={editForm.dueDate}
                      onChange={(val) => handleFormChange({ dueDate: val })}
                      className="flex-1"
                    />
                  )}
                  {(deferEnabled || step.startDate) && (
                    <DatePicker
                      label="Defer until"
                      value={editForm.startDate}
                      onChange={(val) => handleFormChange({ startDate: val })}
                      className="flex-1"
                    />
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!editForm.title.trim()}>
                Save
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTimeline step={step} paths={paths} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
