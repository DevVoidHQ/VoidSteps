import { useSearchHotkey } from "@/hooks/useSearchHotkey";
import {
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { LocalNote, LocalNotebook } from "@/lib/db";

export default function NotesTreePane({
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
    <div
      className={`${activeNoteId ? "hidden md:flex" : "flex"} w-full md:w-72 shrink-0 flex-col border-r border-border`}
    >
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          onClick={(e) => {
            e.stopPropagation();
            onNewNote();
          }}
          className="p-1 rounded hover:bg-foreground/10"
          title="New note"
        >
          <Plus className="w-3 h-3" />
        </span>
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
            handleDeleteClick();
          }}
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
      className={`group w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active ? "bg-primary-light text-primary" : "hover:bg-muted"
      }`}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${active ? "font-medium" : ""}`}>
          {note.title || "Untitled"}
        </div>
        <div className="text-xs text-muted-foreground truncate">{previewFromBody(note.body)}</div>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteClick();
        }}
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
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → text
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1") // inline/block code
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/\[[ xX]\]\s*/g, "") // task checkboxes
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "") // list markers
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, "") // horizontal rules
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/~~(.*?)~~/g, "$1") // strikethrough
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
