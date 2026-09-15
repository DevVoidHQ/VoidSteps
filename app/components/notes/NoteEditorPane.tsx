import { createAutosave } from "@/lib/autosave";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/cn";
import type { LocalNote } from "@/lib/db";
import { reportError } from "@/lib/error-store";

const TITLE_AUTOSAVE_MS = 1000;
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "just now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function NoteEditorPane({
  note,
  onChange,
  focusMode,
  onToggleFocusMode,
  onBack,
}: {
  note: LocalNote | null;
  // Rejects if the write did not land, so the caller can say so.
  onChange: (id: string, patch: { title?: string; body?: string }) => Promise<void>;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [titleStatus, setTitleStatus] = useState<"saved" | "pending" | "error">("saved");
  const [bodyStatus, setBodyStatus] = useState<"saved" | "pending" | "error">("saved");
  const dirty = titleStatus === "pending" || bodyStatus === "pending";
  const saveFailed = titleStatus === "error" || bodyStatus === "error";
  const toast = useToast();
  const titleAreaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTitle = useCallback(() => {
    const el = titleAreaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  // Re-render periodically so the "Saved Xm ago" label stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(resizeTitle, [resizeTitle]);
  const reportSaveFailure = useCallback(
    (error: unknown, action: string) => {
      void reportError("mutation", error, { action });
      toast.error(error instanceof Error ? error.message : "Could not save this note.");
    },
    [toast]
  );
  const noteId = note?._id;
  const persistTitle = useCallback(
    async (value: string) => {
      if (!noteId) return;
      try {
        await onChange(noteId, { title: value || "Untitled" });
      } catch (error) {
        reportSaveFailure(error, "updateNoteTitle");
        throw error;
      }
    },
    [noteId, onChange, reportSaveFailure]
  );
  // The pane is keyed by note id, so this queue always writes to its own note.
  const [titleSave] = useState(() =>
    createAutosave({
      initial: note?.title ?? "",
      delay: TITLE_AUTOSAVE_MS,
      onStatus: setTitleStatus,
      save: persistTitle,
    })
  );
  useLayoutEffect(() => {
    titleSave.setCallbacks(persistTitle, setTitleStatus);
  }, [titleSave, persistTitle]);
  useEffect(
    () => () => {
      void titleSave.flush();
    },
    [titleSave]
  );
  const persistBody = useCallback(
    async (body: string) => {
      if (!noteId) return;
      try {
        await onChange(noteId, { body });
      } catch (error) {
        reportSaveFailure(error, "updateNoteBody");
        throw error;
      }
    },
    [noteId, onChange, reportSaveFailure]
  );

  const focusToggle = (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onToggleFocusMode}
      title={focusMode ? "Exit focus mode" : "Focus mode (hide sidebars)"}
    >
      {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
    </Button>
  );

  if (!note) {
    // On mobile the list takes the whole screen when nothing is open, so the
    // empty editor only shows on md+.
    return (
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <div className="flex items-center px-4 py-3 border-b border-border">{focusToggle}</div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Select or create a note to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Thin toolbar: save state + focus toggle, right-aligned so the global
          timer bar never sits over it. */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Button
          size="icon-sm"
          variant="ghost"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to notes"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span
          className={cn(
            "ml-auto shrink-0 text-xs whitespace-nowrap",
            saveFailed ? "text-destructive font-medium" : "text-muted-foreground"
          )}
        >
          {saveFailed ? "Not saved" : dirty ? "Editing…" : `Saved ${relativeTime(note.updatedAt)}`}
        </span>
        {focusToggle}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Title header band: distinct surface with a 3:2 top:bottom padding
            ratio. Horizontal padding matches the editor body (.bn-editor). */}
        <div className="bg-muted/50 border-b border-border px-5 pt-8 pb-5 md:px-20 md:pt-12 md:pb-8">
          <textarea
            ref={titleAreaRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              titleSave.schedule(e.target.value);
              resizeTitle();
            }}
            onBlur={() => void titleSave.flush()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            rows={1}
            placeholder="Untitled"
            className="block w-full resize-none overflow-hidden bg-transparent text-2xl md:text-4xl font-bold tracking-tight leading-tight outline-none placeholder:text-muted-foreground/40"
          />
        </div>
        <NoteEditor
          key={note._id}
          initialBody={note.body}
          onChange={persistBody}
          onStatus={setBodyStatus}
        />
      </div>
    </div>
  );
}
