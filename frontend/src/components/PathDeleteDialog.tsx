import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Path, Step } from "@/types/index";
import { Button } from "@devvoid/ui";
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(destinationPathId);
    setDestinationPathId(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDestinationPathId(null);
    onOpenChange(false);
  };

  const hasSteps = stepsInPath.length > 0;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
        }}
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "28rem",
          margin: "0 1rem",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-1.5 mb-4">
          <h2 className="text-lg font-semibold">Delete "{path.title}"</h2>
          {hasSteps && (
            <p className="text-sm text-muted-foreground">
              {stepsInPath.length} step{stepsInPath.length !== 1 ? "s" : ""} will be affected
            </p>
          )}
        </div>

        <div className="space-y-4 py-2">
          {/* Step list */}
          {hasSteps && (
            <>
              <div className="max-h-40 overflow-y-auto rounded-md border border-input p-2 space-y-1">
                {stepsInPath.map((step) => (
                  <div
                    key={step._id}
                    className="text-sm px-2 py-1 rounded"
                    style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}
                  >
                    {step.title}
                  </div>
                ))}
              </div>

              {/* Destination selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Move steps to:
                </label>
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
            <p className="text-sm text-muted-foreground">
              {childPaths.length} child path{childPaths.length !== 1 ? "s" : ""} will be moved to{" "}
              {path.parentId ? "the parent path" : "root level"}.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete Path
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
