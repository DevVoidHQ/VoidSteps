import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import {
  buildSnapshot,
  parseSnapshot,
  restoreSnapshot,
  countRows,
  totalRows,
  snapshotFilename,
  SNAPSHOT_TABLES,
  type Snapshot,
} from "@/lib/snapshot";

function describe(snapshot: Snapshot): string {
  const counts = countRows(snapshot.data);
  const parts = SNAPSHOT_TABLES.filter((t) => counts[t] > 0).map((t) => `${counts[t]} ${t}`);
  return parts.length ? parts.join(", ") : "nothing";
}

export default function BackupCard() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const snapshot = await buildSnapshot();
      const blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = snapshotFilename(snapshot.createdAt);
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${totalRows(countRows(snapshot.data))} items`);
    } catch (e) {
      reportError("mutation", e, { action: "exportSnapshot" });
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      setPending(parseSnapshot(await file.text()));
    } catch (e) {
      // parseSnapshot's messages are written to be shown as-is.
      toast.error(e instanceof Error ? e.message : "That file couldn't be read.");
    }
  };

  const confirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const counts = await restoreSnapshot(pending);
      // Every page reads Dexie through live queries, so the UI catches up on its own.
      toast.success(`Restored ${totalRows(counts)} items`);
      setPending(null);
    } catch (e) {
      reportError("mutation", e, { action: "restoreSnapshot" });
      toast.error("Restore failed. Your existing data is untouched.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="type-section">Backup</h2>
            <p className="type-body text-muted-foreground mt-1">
              Your data lives on this device only. Nothing is uploaded anywhere, so a backup file is
              the only way to move it to another machine or get it back after a reset. Keep one
              somewhere safe.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Export a backup"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Restore from a backup
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Reset first, so picking the same file twice still fires onChange.
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!restoring && !o) setPending(null);
        }}
      >
        <DialogContent size="md" className="w-[28rem] max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Restore from a backup</DialogTitle>
            <DialogDescription>
              This replaces everything on this device with the contents of that file (
              {pending ? describe(pending) : ""}). Anything here that isn't in the backup is
              permanently lost. Export first if you aren't sure.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRestore} disabled={restoring}>
              {restoring ? "Restoring…" : "Replace my data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
