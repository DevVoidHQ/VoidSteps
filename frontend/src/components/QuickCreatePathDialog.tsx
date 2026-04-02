import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { useCreatePath } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { Plus } from "lucide-react";

interface QuickCreatePathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCreatePathDialog({ open, onOpenChange }: QuickCreatePathDialogProps) {
  const toast = useToast();
  const { activePaths } = useData();
  const createPathMutation = useCreatePath();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle(""); setDescription(""); setParentId("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await createPathMutation({
        title: trimmed,
        description: description.trim() || undefined,
        parentId: parentId || undefined,
      });
      toast.success(`Created path "${trimmed}"`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: "quickCreatePath" });
      toast.error("Failed to create path");
    }
  }, [title, description, parentId, createPathMutation, toast, resetForm, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
    else if (e.key === "Enter" && !(e.target as HTMLElement).matches("textarea")) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>New Path</DialogTitle></DialogHeader>
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input ref={titleRef} placeholder="Path title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          <HierarchicalPathSelector paths={activePaths || []} selectedPathId={parentId || null} onChange={(id) => setParentId(id || "")} placeholder="Parent Path (optional)" allowEmpty />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}><Plus className="w-4 h-4 mr-2" />Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
