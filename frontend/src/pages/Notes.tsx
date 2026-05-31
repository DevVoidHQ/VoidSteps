import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Pencil, BookOpen, FileText, Search, X, Maximize2, Minimize2, ChevronRight, Check } from "lucide-react";

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

const TITLE_AUTOSAVE_MS = 30_000;
const FOCUS_MODE_KEY = "voidsteps-notes-focus-mode";
const OPEN_NB_KEY = "voidsteps-notes-open-notebook";
const ACTIVE_NOTE_KEY = "voidsteps-notes-active-note";

function getInitialFocusMode(): boolean {
  try {
    return localStorage.getItem(FOCUS_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// "April 17th 2025" - month name + day with ordinal suffix + year.
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

  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(() => readStored(OPEN_NB_KEY));
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => readStored(ACTIVE_NOTE_KEY));
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(() => readStored(OPEN_NB_KEY));
  const [focusMode, setFocusMode] = useState<boolean>(getInitialFocusMode);

  // Persist the open notebook + selected note across navigation.
  useEffect(() => { writeStored(OPEN_NB_KEY, openId); }, [openId]);
  useEffect(() => { writeStored(ACTIVE_NOTE_KEY, activeNoteId); }, [activeNoteId]);

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
    // Don't touch the (possibly restored) selection while Dexie is still loading.
    if (!notes) return;
    if (notesInNotebook.length === 0) {
      setActiveNoteId(null);
      return;
    }
    if (!activeNoteId || !notesInNotebook.find((n) => n._id === activeNoteId)) {
      setActiveNoteId(notesInNotebook[0]._id);
    }
  }, [notes, notesInNotebook, activeNoteId]);

  const activeNote = useMemo(
    () => notes?.find((n) => n._id === activeNoteId) ?? null,
    [notes, activeNoteId]
  );

  // Notes grouped per notebook (filtered by search), newest first.
  const notesByNotebook = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, LocalNote[]>();
    (notes ?? [])
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((n) => {
        const arr = map.get(n.notebookId) ?? [];
        arr.push(n);
        map.set(n.notebookId, arr);
      });
    return map;
  }, [notes, search]);

  // Accordion: at most one notebook open at a time. Opening one selects its
  // first note. While searching, every notebook with matches is shown open.
  const openNotebook = useCallback(
    (id: string) => {
      if (openId === id) {
        setOpenId(null);
        return;
      }
      setOpenId(id);
      setActiveNotebookId(id);
      const first = notesByNotebook.get(id)?.[0];
      setActiveNoteId(first ? first._id : null);
    },
    [openId, notesByNotebook],
  );

  const effectiveExpanded = useMemo(() => {
    if (search.trim()) {
      return new Set([...notesByNotebook.keys()]);
    }
    return new Set(openId ? [openId] : []);
  }, [search, notesByNotebook, openId]);

  const handleNewNotebook = useCallback(async () => {
    const nb = await createNotebook({ title: "New Notebook" });
    setActiveNotebookId(nb._id);
    setActiveNoteId(null);
    setEditingNotebookId(nb._id);
  }, [createNotebook]);

  const handleNewNote = useCallback(async (notebookId?: string) => {
    const target = notebookId ?? activeNotebookId;
    if (!target) return;
    const note = await createNote({
      notebookId: target,
      title: formatDateTitle(new Date()),
      body: "",
    });
    setActiveNoteId(note._id);
  }, [activeNotebookId, createNote]);

  const handleDeleteNotebook = useCallback(
    async (id: string) => {
      await deleteNotebook(id);
      if (activeNotebookId === id) {
        setActiveNotebookId(null);
        setActiveNoteId(null);
      }
      if (openId === id) setOpenId(null);
    },
    [deleteNotebook, activeNotebookId, openId]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      await deleteNote(id);
      if (activeNoteId === id) setActiveNoteId(null);
    },
    [deleteNote, activeNoteId]
  );

  // Stable so the editor's flush-on-switch effect doesn't re-fire each render.
  const handleEditorChange = useCallback(
    (id: string, patch: { title?: string; body?: string }) => updateNote({ id, ...patch }),
    [updateNote]
  );

  return (
    <div className="flex h-full min-h-screen">
      {!focusMode && (
        <NotesTreePane
          notebooks={sortedNotebooks}
          notesByNotebook={notesByNotebook}
          expanded={effectiveExpanded}
          activeNotebookId={activeNotebookId}
          activeNoteId={activeNoteId}
          editingNotebookId={editingNotebookId}
          search={search}
          onSearch={setSearch}
          onToggleExpand={openNotebook}
          onSelectNotebook={openNotebook}
          onSelectNote={(id) => setActiveNoteId(id)}
          onNewNotebook={handleNewNotebook}
          onNewNote={(notebookId) => {
            setActiveNotebookId(notebookId);
            setOpenId(notebookId);
            handleNewNote(notebookId);
          }}
          onStartEditNotebook={setEditingNotebookId}
          onEndEditNotebook={() => setEditingNotebookId(null)}
          onRenameNotebook={(id, title) => updateNotebook({ id, title })}
          onDeleteNotebook={handleDeleteNotebook}
          onDeleteNote={handleDeleteNote}
        />
      )}
      <NoteEditorPane
        note={activeNote}
        onChange={handleEditorChange}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Notes tree pane (notebooks → expand to nested notes)
// ────────────────────────────────────────────────────────────

function NotesTreePane({
  notebooks,
  notesByNotebook,
  expanded,
  activeNotebookId,
  activeNoteId,
  editingNotebookId,
  search,
  onSearch,
  onToggleExpand,
  onSelectNotebook,
  onSelectNote,
  onNewNotebook,
  onNewNote,
  onStartEditNotebook,
  onEndEditNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  onDeleteNote,
}: {
  notebooks: LocalNotebook[];
  notesByNotebook: Map<string, LocalNote[]>;
  expanded: Set<string>;
  activeNotebookId: string | null;
  activeNoteId: string | null;
  editingNotebookId: string | null;
  search: string;
  onSearch: (q: string) => void;
  onToggleExpand: (id: string) => void;
  onSelectNotebook: (id: string) => void;
  onSelectNote: (id: string) => void;
  onNewNotebook: () => void;
  onNewNote: (notebookId: string) => void;
  onStartEditNotebook: (id: string) => void;
  onEndEditNotebook: () => void;
  onRenameNotebook: (id: string, title: string) => void;
  onDeleteNotebook: (id: string) => void;
  onDeleteNote: (id: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef);
  return (
    <div className="w-72 shrink-0 flex flex-col border-r border-border">
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Notes
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onNewNotebook} title="New notebook">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search notes…"
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
        {notebooks.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            No notebooks. Create one to start.
          </div>
        ) : (
          notebooks.map((nb) => {
            const isOpen = expanded.has(nb._id);
            const nbNotes = notesByNotebook.get(nb._id) ?? [];
            return (
              <div key={nb._id}>
                <NotebookTreeRow
                  notebook={nb}
                  open={isOpen}
                  active={nb._id === activeNotebookId}
                  count={nbNotes.length}
                  editing={editingNotebookId === nb._id}
                  onToggle={() => onToggleExpand(nb._id)}
                  onSelect={() => onSelectNotebook(nb._id)}
                  onNewNote={() => onNewNote(nb._id)}
                  onStartEdit={() => onStartEditNotebook(nb._id)}
                  onSubmitEdit={(title) => {
                    if (title.trim()) onRenameNotebook(nb._id, title.trim());
                    onEndEditNotebook();
                  }}
                  onDelete={() => onDeleteNotebook(nb._id)}
                />
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-2 transition-opacity duration-200 ${
                        isOpen ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {nbNotes.length === 0 ? (
                        <div className="text-xs text-muted-foreground px-2 py-1.5">
                          {search.trim() ? "No matches" : "No notes yet"}
                        </div>
                      ) : (
                        nbNotes.map((note) => (
                          <NoteTreeRow
                            key={note._id}
                            note={note}
                            active={note._id === activeNoteId}
                            onSelect={() => onSelectNote(note._id)}
                            onDelete={() => onDeleteNote(note._id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NotebookTreeRow({
  notebook,
  open,
  active,
  count,
  editing,
  onToggle,
  onSelect,
  onNewNote,
  onStartEdit,
  onSubmitEdit,
  onDelete,
}: {
  notebook: LocalNotebook;
  open: boolean;
  active: boolean;
  count: number;
  editing: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onNewNote: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (title: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(notebook.title);
  const [confirmDel, setConfirmDel] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) setDraft(notebook.title);
  }, [editing, notebook.title]);

  const handleDeleteClick = () => {
    if (!confirmDel) {
      setConfirmDel(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmDel(false);
    onDelete();
  };

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
    <div
      onClick={onSelect}
      onDoubleClick={onStartEdit}
      className={`group w-full flex items-center gap-1.5 px-2 py-2 rounded-md text-sm text-left transition-colors ${
        active ? "bg-primary-light text-primary font-medium" : "text-foreground hover:bg-muted"
      }`}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="p-0.5 rounded hover:bg-foreground/10 shrink-0"
        title={open ? "Collapse" : "Expand"}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </span>
      <BookOpen className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{notebook.title}</span>
      <span className="text-xs text-muted-foreground group-hover:hidden">{count}</span>
      <span className="hidden group-hover:flex items-center gap-0.5">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onNewNote(); }}
          className="p-1 rounded hover:bg-foreground/10"
          title="New note"
        >
          <Plus className="w-3 h-3" />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
          className="p-1 rounded hover:bg-foreground/10"
          title="Rename"
        >
          <Pencil className="w-3 h-3" />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
          className={`p-1 rounded ${
            confirmDel ? "bg-destructive/15 text-destructive" : "hover:bg-foreground/10"
          }`}
          title={confirmDel ? "Click again to delete notebook + its notes" : "Delete"}
        >
          {confirmDel ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
        </span>
      </span>
    </div>
  );
}

function NoteTreeRow({
  note,
  active,
  onSelect,
  onDelete,
}: {
  note: LocalNote;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = () => {
    if (!confirmDel) {
      setConfirmDel(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmDel(false);
    onDelete();
  };

  return (
    <button
      onClick={onSelect}
      className={`group w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
        active ? "bg-primary-light text-primary" : "hover:bg-muted"
      }`}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${active ? "font-medium" : ""}`}>
          {note.title || "Untitled"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {previewFromBody(note.body)}
        </div>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
        className={`p-1 rounded transition-opacity ${
          confirmDel
            ? "bg-destructive/15 text-destructive opacity-100"
            : "opacity-0 group-hover:opacity-100 hover:bg-foreground/10"
        }`}
        title={confirmDel ? "Click again to delete this note" : "Delete"}
      >
        {confirmDel ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
      </span>
    </button>
  );
}

// Extract a short preview from a note body. Accepts either a BlockNote JSON
// document (new format) or raw markdown/text (legacy), gracefully falling back.
function previewFromBody(body: string): string {
  if (!body) return "Empty";
  const trimmed = body.trim();
  let text = trimmed;
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      // Join top-level blocks with newlines so the preview keeps line structure.
      text = Array.isArray(parsed)
        ? parsed.map((b) => extractText(b)).join("\n")
        : extractText(parsed);
    } catch {
      // fall through, treat as markdown/plain text
    }
  }
  // Show the first non-empty line (respecting line breaks), markdown stripped.
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line))
    .find((line) => line.length > 0);
  return firstLine ? firstLine.slice(0, 80) : "Empty";
}

// Strip common markdown syntax so list previews read as plain text.
function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")        // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")      // links → text
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")        // inline/block code
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")           // headings
    .replace(/^\s*>\s?/gm, "")                    // blockquotes
    .replace(/\[[ xX]\]\s*/g, "")                 // task checkboxes
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")        // list markers
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, "")      // horizontal rules
    .replace(/(\*\*|__)(.*?)\1/g, "$2")           // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")              // italic
    .replace(/~~(.*?)~~/g, "$1")                  // strikethrough
    .replace(/\s+/g, " ")
    .trim();
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

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "just now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function NoteEditorPane({
  note,
  onChange,
  focusMode,
  onToggleFocusMode,
}: {
  note: LocalNote | null;
  onChange: (id: string, patch: { title?: string; body?: string }) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [dirty, setDirty] = useState(false); // unsaved edits pending
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleAreaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTitle = useCallback(() => {
    const el = titleAreaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  // Pending title save bound to its note id, so a delayed flush after a note
  // switch still writes to the correct note.
  const pendingTitle = useRef<{ id: string; value: string } | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  // Re-render periodically so the "Saved Xm ago" label stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setDirty(false);
    // Resize after the value commits.
    requestAnimationFrame(resizeTitle);
  }, [note?._id, resizeTitle]);

  const flushTitle = useCallback(() => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const p = pendingTitle.current;
    if (p) {
      pendingTitle.current = null;
      onChange(p.id, { title: p.value || "Untitled" });
    }
  }, [onChange]);

  // Flush a pending title on note switch / unmount.
  useEffect(() => () => flushTitle(), [note?._id, flushTitle]);

  const scheduleTitleSave = (value: string) => {
    const id = noteRef.current?._id;
    if (!id) return;
    pendingTitle.current = { id, value };
    setDirty(true);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      flushTitle();
      setDirty(false);
    }, TITLE_AUTOSAVE_MS);
  };

  // Body save bound to this note's id (delayed flushes target the right note).
  const noteId = note?._id ?? null;
  const initialBody = note?.body ?? "";
  const persistBody = useCallback(
    (body: string) => {
      if (!noteId) return;
      if (body === initialBody) return;
      onChange(noteId, { body });
      setDirty(false);
    },
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
      {/* Thin toolbar: save state + focus toggle, right-aligned so the global
          timer bar never sits over it. */}
      <div className="flex items-center justify-end gap-3 px-4 py-2">
        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
          {dirty ? "Editing…" : `Saved ${relativeTime(note.updatedAt)}`}
        </span>
        {focusToggle}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Title is the document's heading 1, inline at the top (Notion-style).
            Horizontal padding matches the editor body (.bn-editor: 3rem 5rem). */}
        <textarea
          ref={titleAreaRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleTitleSave(e.target.value);
            resizeTitle();
          }}
          onBlur={() => {
            flushTitle();
            setDirty(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          rows={1}
          placeholder="Untitled"
          className="block w-full resize-none overflow-hidden bg-transparent px-20 pt-12 text-4xl font-bold tracking-tight leading-tight outline-none placeholder:text-muted-foreground/40"
        />
        <NoteEditor
          key={note._id}
          initialBody={note.body}
          onChange={persistBody}
          onEditing={() => setDirty(true)}
        />
      </div>
    </div>
  );
}
