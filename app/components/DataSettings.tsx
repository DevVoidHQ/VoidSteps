import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import {
  getDataCounts,
  getHistoryCounts,
  getPathCascadeImpact,
  WIPE_ENTITIES,
  WIPE_ENTITY_LABELS,
  wipeData,
  type WipeEntity,
} from "@/lib/wipe-data";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

// An action the user can trigger from the danger zone.
type WipeAction = { kind: "type"; entity: WipeEntity } | { kind: "todos" } | { kind: "full" };

type Counts = Record<WipeEntity, number>;

const ZERO: Counts = {
  steps: 0,
  paths: 0,
  routines: 0,
  reminders: 0,
  notebooks: 0,
  notes: 0,
};

export default function DataSettings() {
  const toast = useToast();
  const summary = useLiveQuery(
    () => Promise.all([getDataCounts(), getPathCascadeImpact(), getHistoryCounts()]),
    []
  );
  const counts = summary?.[0] ?? ZERO;
  const cascadeImpact = summary?.[1] ?? { steps: 0 };
  const history = summary?.[2] ?? { timeEntries: 0, activityEvents: 0 };
  const historyCount = history.timeEntries + history.activityEvents;
  const [action, setAction] = useState<WipeAction | null>(null);
  const [cascade, setCascade] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const total = WIPE_ENTITIES.reduce((sum, e) => sum + counts[e], historyCount);

  const openAction = (a: WipeAction) => {
    setAction(a);
    setCascade(false);
    setConfirmText("");
  };
  const closeAction = () => {
    if (!busy) setAction(null);
  };

  // Resolve the entity set + cascade flags for the current action.
  const resolved = (() => {
    if (!action) return null;
    if (action.kind === "full") {
      return { names: [...WIPE_ENTITIES], count: total, forcedCascade: false };
    }
    if (action.kind === "todos") {
      return {
        names: ["steps", "routines"] as WipeEntity[],
        count: counts.steps + counts.routines + historyCount,
        forcedCascade: false,
      };
    }
    return {
      names: [action.entity],
      count: counts[action.entity] + (action.entity === "steps" ? historyCount : 0),
      forcedCascade: action.entity === "notebooks", // notebooks always take their notes
    };
  })();

  const isPaths = action?.kind === "type" && action.entity === "paths";
  // Always require typing DELETE. Every action here is destructive.
  const requiredText = "DELETE";
  const confirmReady =
    !!resolved && resolved.count > 0 && confirmText.trim() === requiredText && !busy;

  const handleConfirm = async () => {
    if (!resolved || !confirmReady) return;
    setBusy(true);
    try {
      await wipeData(resolved.names, { cascade: isPaths ? cascade : false });
      toast.success("Data deleted");
      setAction(null);
    } catch (e) {
      reportError("mutation", e, { action: "wipeData" });
      toast.error("Failed to delete data");
    } finally {
      setBusy(false);
    }
  };

  // Human-readable impact line shown in the modal.
  const impactLine = (() => {
    if (!resolved) return "";
    if (action?.kind === "full")
      return `Everything: ${total} item${total === 1 ? "" : "s"} across all types.`;
    if (action?.kind === "todos")
      return `${counts.steps} step${counts.steps === 1 ? "" : "s"} and ${counts.routines} routine${counts.routines === 1 ? "" : "s"}, plus ${historyCount} history records.`;
    const e = (action as { entity: WipeEntity }).entity;
    const base = `${counts[e]} ${WIPE_ENTITY_LABELS[e].toLowerCase()}`;
    if (e === "notebooks")
      return `${base} and all ${counts.notes} note${counts.notes === 1 ? "" : "s"} inside them.`;
    if (e === "paths" && cascade)
      return `${base}, plus ${cascadeImpact.steps} step${cascadeImpact.steps === 1 ? "" : "s"} inside them.`;
    return `${base}${e === "steps" ? `, plus ${historyCount} history records` : ""}.`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-section">Data</h2>
        <p className="type-body text-muted-foreground mt-1">
          Permanently delete your data. This applies to this device and can't be undone.
        </p>
      </div>

      {/* Bulk actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <DangerRow
            label="All to-dos"
            description="Every step, routine and history record. Paths, notes and reminders are kept."
            count={counts.steps + counts.routines + historyCount}
            onClick={() => openAction({ kind: "todos" })}
          />
          <DangerRow
            label="Everything"
            description="A full wipe of all steps, paths, routines, reminders, notebooks, notes and history records."
            count={total}
            onClick={() => openAction({ kind: "full" })}
            emphasize
          />
        </CardContent>
      </Card>

      {/* Per-type actions */}
      <div>
        <h3 className="type-label text-muted-foreground mb-2">By type</h3>
        <Card>
          <CardContent className="p-4 space-y-3">
            {WIPE_ENTITIES.map((e) => (
              <DangerRow
                key={e}
                label={`All ${WIPE_ENTITY_LABELS[e].toLowerCase()}`}
                count={counts[e] + (e === "steps" ? historyCount : 0)}
                onClick={() => openAction({ kind: "type", entity: e })}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Confirm modal */}
      <Dialog
        open={!!action}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
      >
        <DialogContent size="md" className="w-[28rem] max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive-ink" />
              Delete data
            </DialogTitle>
            <DialogDescription>
              This permanently deletes {impactLine} It can't be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {isPaths && (
              <Toggle
                size="sm"
                checked={cascade}
                onChange={(e) => {
                  setCascade(e.target.checked);
                  setConfirmText("");
                }}
                label="Also delete the steps inside these paths"
              />
            )}

            <div>
              <label className="type-body text-muted-foreground">
                Type <span className="font-mono font-semibold text-foreground">{requiredText}</span>{" "}
                to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requiredText}
                autoFocus
                className="mt-1.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmReady) handleConfirm();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!confirmReady}>
              <Trash2 className="w-4 h-4 mr-2" />
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DangerRow({
  label,
  description,
  count,
  onClick,
  emphasize,
}: {
  label: string;
  description?: string;
  count: number;
  onClick: () => void;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className={`type-title ${emphasize ? "font-semibold" : ""}`}>
          {label} <span className="text-muted-foreground font-normal">({count})</span>
        </div>
        {description && <p className="type-meta text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Button
        variant={emphasize ? "destructive" : "outline"}
        size="sm"
        onClick={onClick}
        aria-label={`Delete ${label.toLowerCase()}`}
        disabled={count === 0}
        className="shrink-0"
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Delete
      </Button>
    </div>
  );
}
