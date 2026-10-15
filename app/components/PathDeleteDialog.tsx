import { useEffect, useState } from "react";
import type { Path, Step } from "@/types/index";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { HierarchicalPathSelector } from "./HierarchicalPathSelector";

interface PathDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: Path;
  stepsInPath: Step[];
  childPaths: Path[];
  allPaths: Path[];
  onConfirm: (destinationPathId: string | null) => void;
}

export function PathDeleteDialog({
  open,
  onOpenChange,
  path,
  stepsInPath,
  childPaths,
  allPaths,
  onConfirm,
}: PathDeleteDialogProps) {
  const [destinationPathId, setDestinationPathId] = useState<string | null>(null);
  const hasSteps = stepsInPath.length > 0;

  const handleConfirm = () => {
    onConfirm(destinationPathId);
    setDestinationPathId(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDestinationPathId(null);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement;
      if (t.matches("textarea, input, select, button, [role=listbox], [role=option]")) return;
      e.preventDefault();
      handleConfirm();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{path.title}&rdquo;</DialogTitle>
          {hasSteps && (
            <DialogDescription>
              {stepsInPath.length} step{stepsInPath.length !== 1 ? "s" : ""} will be affected
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step list */}
          {hasSteps && (
            <>
              <div className="max-h-40 overflow-y-auto rounded-md bg-field p-2 space-y-1">
                {stepsInPath.map((step) => (
                  <div key={step._id} className="type-body px-2 py-1 rounded bg-muted/30">
                    {step.title}
                  </div>
                ))}
              </div>

              {/* Destination selector */}
              <div className="space-y-2">
                <label className="type-label">Move steps to:</label>
                <HierarchicalPathSelector
                  paths={allPaths}
                  selectedPathId={destinationPathId}
                  onChange={(id) => setDestinationPathId(id)}
                  placeholder="No path"
                  allowEmpty={true}
                  excludeIds={[path._id]}
                />
              </div>
            </>
          )}

          {/* Child paths info */}
          {childPaths.length > 0 && (
            <p className="type-body text-muted-foreground">
              {childPaths.length} child path{childPaths.length !== 1 ? "s" : ""} will be moved to{" "}
              {path.parentId ? "the parent path" : "root level"}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete Path
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
