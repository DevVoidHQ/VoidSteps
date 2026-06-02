import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreatePath, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/local-mutations";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { Plus } from "lucide-react";

interface QuickCreatePathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCreatePathDialog({ open, onOpenChange }: QuickCreatePathDialogProps) {
  const toast = useToast();
  const createPathMutation = useCreatePath();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle(""); setDescription("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await createPathMutation({
        title: trimmed,
        description: description.trim() || undefined,
      });
      toast.success(`Created path "${trimmed}"`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      reportError("mutation", error, { action: "quickCreatePath" });
      toast.error("Failed to create path");
    }
  }, [title, description, createPathMutation, toast, resetForm, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" && e.shiftKey && !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    handleSubmit();
  }, [handleSubmit]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>New Path</DialogTitle></DialogHeader>
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <Input ref={titleRef} placeholder="Path title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE_LENGTH} />
          <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={MAX_DESCRIPTION_LENGTH}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}><Plus className="w-4 h-4 mr-2" />Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
