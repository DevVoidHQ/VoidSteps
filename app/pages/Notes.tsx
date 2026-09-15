import NoteEditorPane from "@/components/notes/NoteEditorPane";
import NotesTreePane from "@/components/notes/NotesTreePane";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { LocalNote } from "@/lib/db";
import { db } from "@/lib/db";
import {
  useCreateNote,
  useCreateNotebook,
  useDeleteNote,
  useDeleteNotebook,
  useUpdateNote,
  useUpdateNotebook,
} from "@/lib/local-mutations";

// Matches NoteEditor's body debounce, and for the same reason: a local
// IndexedDB write has no queue to spare, so there is nothing to batch.
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
  const notebooks = useLiveQuery(() => db.notebooks.toArray(), []);
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(() =>
    readStored(OPEN_NB_KEY)
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() =>
    readStored(ACTIVE_NOTE_KEY)
  );
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(() => readStored(OPEN_NB_KEY));
  const [focusMode, setFocusMode] = useState<boolean>(getInitialFocusMode);

  // Desktop shows the editor beside the list (always keep a note open); mobile
  // is master→detail, so it must be able to sit on the list with no note open.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist the open notebook + selected note across navigation.
  useEffect(() => {
    writeStored(OPEN_NB_KEY, openId);
  }, [openId]);
  useEffect(() => {
    writeStored(ACTIVE_NOTE_KEY, activeNoteId);
  }, [activeNoteId]);

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
    // Stale selection (note deleted / moved out): clear it.
    if (activeNoteId && !notesInNotebook.find((n) => n._id === activeNoteId)) {
      setActiveNoteId(null);
      return;
    }
    // Desktop keeps the first note open by default; mobile starts on the list
    // so the back button can return there without instantly reopening a note.
    if (!activeNoteId && isDesktop) {
      setActiveNoteId(notesInNotebook[0]._id);
    }
  }, [notes, notesInNotebook, activeNoteId, isDesktop]);

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
    [openId, notesByNotebook]
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

  const handleNewNote = useCallback(
    async (notebookId?: string) => {
      const target = notebookId ?? activeNotebookId;
      if (!target) return;
      const note = await createNote({
        notebookId: target,
        title: formatDateTitle(new Date()),
        body: "",
      });
      setActiveNoteId(note._id);
    },
    [activeNotebookId, createNote]
  );

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
        key={activeNote?._id ?? "empty"}
        note={activeNote}
        onChange={handleEditorChange}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        onBack={() => {
          setActiveNoteId(null);
          if (focusMode) toggleFocusMode(); // focus mode hides the list; leave it
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Notes tree pane (notebooks → expand to nested notes)
// ────────────────────────────────────────────────────────────
