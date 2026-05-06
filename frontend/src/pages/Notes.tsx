import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Pencil, BookOpen, FileText, Search, X, Maximize2, Minimize2 } from "lucide-react";

import { db } from "@/lib/db";
import type { LocalNotebook, LocalNote } from "@/lib/db";
import {
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/lib/local-mutations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NoteEditor } from "@/components/notes/NoteEditor";

const TITLE_AUTOSAVE_MS = 500;
const FOCUS_MODE_KEY = "voidsteps-notes-focus-mode";

function getInitialFocusMode(): boolean {
  try {
    return localStorage.getItem(FOCUS_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

// "April 17th 2025" — month name + day with ordinal suffix + year.
function formatDateTitle(d: Date): string {
  const month = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const rem100 = day % 100;
  const rem10 = day % 10;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : rem10 === 1
      ? "st"
      : rem10 === 2
      ? "nd"
      : rem10 === 3
      ? "rd"
      : "th";
  return `${month} ${day}${suffix} ${year}`;
}

export default function Notes() {
  const notebooks = useLiveQuery(
    () => db.notebooks.filter((n) => !n._deleted).toArray(),
    []
  );
  const notes = useLiveQuery(
    () => db.notes.filter((n) => !n._deleted).toArray(),
    []
  );

  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [focusMode, setFocusMode] = useState<boolean>(getInitialFocusMode);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FOCUS_MODE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const createNotebook = useCreateNotebook();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const sortedNotebooks = useMemo(() => {
    if (!notebooks) return [];
    return [...notebooks].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  }, [notebooks]);

  useEffect(() => {
    if (!activeNotebookId && sortedNotebooks.length > 0) {
      setActiveNotebookId(sortedNotebooks[0]._id);
    }
  }, [sortedNotebooks, activeNotebookId]);

  const notesInNotebook = useMemo(() => {
    if (!notes || !activeNotebookId) return [];
    const filtered = notes
      .filter((n) => n.notebookId === activeNotebookId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }, [notes, activeNotebookId, search]);

  useEffect(() => {
    if (notesInNotebook.length === 0) {
      setActiveNoteId(null);
      return;
    }
    if (!activeNoteId || !notesInNotebook.find((n) => n._id === activeNoteId)) {
      setActiveNoteId(notesInNotebook[0]._id);
    }
  }, [notesInNotebook, activeNoteId]);

  const activeNote = useMemo(
    () => notes?.find((n) => n._id === activeNoteId) ?? null,
    [notes, activeNoteId]
  );

  const handleNewNotebook = useCallback(async () => {
    const nb = await createNotebook({ title: "New Notebook" });
    setActiveNotebookId(nb._id);
    setActiveNoteId(null);
    setEditingNotebookId(nb._id);
  }, [createNotebook]);

  const handleNewNote = useCallback(async () => {
    if (!activeNotebookId) return;
    const note = await createNote({
      notebookId: activeNotebookId,
      title: formatDateTitle(new Date()),
      body: "",
    });
    setActiveNoteId(note._id);
  }, [activeNotebookId, createNote]);

  const handleDeleteNotebook = useCallback(
    async (id: string) => {
      if (!confirm("Delete this notebook and all its notes?")) return;
      await deleteNotebook(id);
      if (activeNotebookId === id) {
        setActiveNotebookId(null);
        setActiveNoteId(null);
      }
    },
    [deleteNotebook, activeNotebookId]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      await deleteNote(id);
      if (activeNoteId === id) setActiveNoteId(null);
    },
    [deleteNote, activeNoteId]
  );

  return (
    <div className="flex h-full min-h-screen">
      {!focusMode && (
        <>
          <NotebookPane
            notebooks={sortedNotebooks}
            activeId={activeNotebookId}
            editingId={editingNotebookId}
            onStartEdit={setEditingNotebookId}
            onEndEdit={() => setEditingNotebookId(null)}
            onSelect={(id) => {
              setActiveNotebookId(id);
              setActiveNoteId(null);
            }}
            onNew={handleNewNotebook}
            onRename={(id, title) => updateNotebook({ id, title })}
            onDelete={handleDeleteNotebook}
          />
          <NoteListPane
            notes={notesInNotebook}
            activeId={activeNoteId}
            onSelect={setActiveNoteId}
            onNew={handleNewNote}
            onDelete={handleDeleteNote}
            disabled={!activeNotebookId}
            search={search}
            onSearch={setSearch}
          />
        </>
      )}
      <NoteEditorPane
        note={activeNote}
        onChange={(patch) => activeNote && updateNote({ id: activeNote._id, ...patch })}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Notebook pane
// ────────────────────────────────────────────────────────────

function NotebookPane({
  notebooks,
  activeId,
  editingId,
  onStartEdit,
  onEndEdit,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  notebooks: LocalNotebook[];
  activeId: string | null;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-border">
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Notebooks
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onNew} title="New notebook">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {notebooks.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            No notebooks. Create one to start.
          </div>
        ) : (
          notebooks.map((nb) => (
            <NotebookRow
              key={nb._id}
              notebook={nb}
              active={nb._id === activeId}
              editing={editingId === nb._id}
              onSelect={() => onSelect(nb._id)}
              onStartEdit={() => onStartEdit(nb._id)}
              onSubmitEdit={(title) => {
                if (title.trim()) onRename(nb._id, title.trim());
                onEndEdit();
              }}
              onDelete={() => onDelete(nb._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotebookRow({
  notebook,
  active,
  editing,
  onSelect,
  onStartEdit,
  onSubmitEdit,
  onDelete,
}: {
  notebook: LocalNotebook;
  active: boolean;
  editing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (title: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(notebook.title);

  useEffect(() => {
    if (editing) setDraft(notebook.title);
  }, [editing, notebook.title]);

  if (editing) {
    return (
      <div className="px-2 py-1.5">
        <Input
          autoFocus
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onSubmitEdit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitEdit(draft);
            if (e.key === "Escape") onSubmitEdit(notebook.title);
          }}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      onDoubleClick={onStartEdit}
      className={`group w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left transition-colors ${
        active
          ? "bg-primary-light text-primary font-medium"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <BookOpen className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{notebook.title}</span>
      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="p-1 rounded hover:bg-foreground/10"
          title="Rename"
        >
          <Pencil className="w-3 h-3" />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-foreground/10"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </span>
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Note list pane
// ────────────────────────────────────────────────────────────

function NoteListPane({
  notes,
  activeId,
  onSelect,
  onNew,
  onDelete,
  disabled,
  search,
  onSearch,
}: {
  notes: LocalNote[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  disabled: boolean;
  search: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="w-72 shrink-0 flex flex-col border-r border-border">
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Notes
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onNew}
            disabled={disabled}
            title="New note"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search notes…"
            disabled={disabled}
            className="h-8 pl-7 pr-7 text-sm"
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {disabled ? (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            Select a notebook
          </div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            No notes yet.
          </div>
        ) : (
          notes.map((note) => (
            <button
              key={note._id}
              onClick={() => onSelect(note._id)}
              className={`group w-full flex items-start gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                note._id === activeId
                  ? "bg-primary-light text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm truncate ${
                    note._id === activeId ? "font-medium" : ""
                  }`}
                >
                  {note.title || "Untitled"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {previewFromBody(note.body)}
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-foreground/10"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Extract a short preview from a note body. Accepts either a BlockNote JSON
// document (new format) or raw markdown/text (legacy), gracefully falling back.
function previewFromBody(body: string): string {
  if (!body) return "Empty";
  const trimmed = body.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const blocks = JSON.parse(trimmed);
      const text = extractText(blocks).trim();
      return text ? text.slice(0, 60) : "Empty";
    } catch {
      // fall through
    }
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 60);
}

function extractText(node: unknown): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    let acc = "";
    for (const key of ["content", "children"]) {
      if (obj[key]) acc += " " + extractText(obj[key]);
    }
    return acc;
  }
  return "";
}

// ────────────────────────────────────────────────────────────
// Editor pane
// ────────────────────────────────────────────────────────────

function NoteEditorPane({
  note,
  onChange,
  focusMode,
  onToggleFocusMode,
}: {
  note: LocalNote | null;
  onChange: (patch: { title?: string; body?: string }) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  useEffect(() => {
    setTitle(note?.title ?? "");
  }, [note?._id]);

  // Flush any pending title save on note switch / unmount.
  useEffect(() => {
    return () => {
      if (titleTimer.current) {
        clearTimeout(titleTimer.current);
        titleTimer.current = null;
      }
    };
  }, [note?._id]);

  const scheduleTitleSave = (value: string) => {
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      const current = noteRef.current;
      if (current && value !== current.title) onChange({ title: value || "Untitled" });
    }, TITLE_AUTOSAVE_MS);
  };

  const flushTitleNow = () => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const current = noteRef.current;
    if (current && title !== current.title) onChange({ title: title || "Untitled" });
  };

  // Bind the persist callback to this specific note's id + initial body.
  // Editor unmount may flush after a note switch — without binding, the
  // flush would write the old note's body onto the new active note.
  const noteId = note?._id ?? null;
  const initialBody = note?.body ?? "";
  const persistBody = useCallback(
    (body: string) => {
      if (!noteId) return;
      if (body === initialBody) return;
      onChange({ body });
    },
    // onChange captures activeNote via parent closure; it's safe here because
    // we only fire when noteId is set, and Notes.tsx guards on activeNote.
    [noteId, initialBody, onChange]
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
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center px-4 py-3 border-b border-border">
          {focusToggle}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Select or create a note to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {focusToggle}
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleTitleSave(e.target.value);
          }}
          onBlur={flushTitleNow}
          placeholder="Title"
          className="h-9 text-base font-semibold border-transparent focus-visible:border-input bg-transparent"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <NoteEditor key={note._id} initialBody={note.body} onChange={persistBody} />
      </div>
    </div>
  );
}
