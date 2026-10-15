import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { exportNotesZip } from "@/lib/notes-export";
import { wipeData } from "@/lib/wipe-data";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Notes were removed from VoidSteps, but their data was kept. This card is the
 * way out: export them as Markdown, then delete them. It disappears once there
 * is nothing left.
 */
export default function NotesExportCard() {
  const toast = useToast();
  const counts = useLiveQuery(async () => ({
    notes: await db.notes.count(),
    notebooks: await db.notebooks.count(),
  }));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!counts || (counts.notes === 0 && counts.notebooks === 0)) return null;

  const handleExport = async () => {
    setBusy(true);
    try {
      const { data, count } = await exportNotesZip();
      const url = URL.createObjectURL(
        new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/zip" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `voidsteps-notes-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      // Revoking straight away can cancel the download in WebKit.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(`Exported ${count} note${count === 1 ? "" : "s"} to Downloads`);
    } catch (e) {
      reportError("mutation", e, { action: "exportNotes" });
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="type-section">Your notes</h2>
          <p className="mt-1 type-body text-muted-foreground">
            Notes are no longer part of VoidSteps. Your {counts.notes} note
            {counts.notes === 1 ? "" : "s"} in {counts.notebooks} notebook
            {counts.notebooks === 1 ? "" : "s"} are still here. Export them as Markdown (a zip with
            a folder per notebook), then delete them when you are done.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={busy}>
            <Download className="mr-2 h-4 w-4" />
            {busy ? "Exporting…" : "Export as Markdown"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete notes
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete all notes?"
        description="Every notebook and note is removed for good. Export them first if you want to keep them."
        confirmLabel="Delete notes"
        onConfirm={async () => {
          try {
            await wipeData(["notebooks"]);
            toast.success("Notes deleted");
          } catch (e) {
            reportError("mutation", e, { action: "deleteNotes" });
            toast.error("Failed to delete notes");
          }
        }}
      />
    </Card>
  );
}
