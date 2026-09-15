import type { LocalNote, LocalNotebook } from "../db";
import { db } from "../db";
import { generateLocalId, validateDescription, validateTitle } from "./helpers";

export const createNotebook = async (args: { title: string; description?: string }) => {
  validateTitle(args.title);
  validateDescription(args.description);
  const now = Date.now();
  const id = generateLocalId();

  const notebook: LocalNotebook = {
    _id: id,
    title: args.title,
    description: args.description,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.notebooks.add(notebook);
  return notebook;
};

export const updateNotebook = async (args: {
  id: string;
  title?: string;
  description?: string | null;
  archived?: boolean;
}) => {
  if (args.title !== undefined) validateTitle(args.title);
  if (args.description !== undefined && args.description !== null)
    validateDescription(args.description);
  const existing = await db.notebooks.get(args.id);
  if (!existing) throw new Error("Notebook not found");

  const now = Date.now();
  const patch: Partial<LocalNotebook> = { updatedAt: now };
  if (args.title !== undefined) patch.title = args.title;
  if (args.description !== undefined) {
    patch.description = args.description === null ? undefined : args.description;
  }
  if (args.archived !== undefined) {
    patch.archived = args.archived;
    patch.archivedAt = args.archived ? now : undefined;
  }

  await db.notebooks.update(args.id, patch);
};

export const deleteNotebook = async (id: string) => {
  // Deleting the notebook without also deleting its notes (or vice versa)
  // would leave notes pointing at a notebook that no longer exists, with
  // no server copy to recover the missing half from.
  await db.transaction("rw", [db.notebooks, db.notes], async () => {
    const existing = await db.notebooks.get(id);
    if (!existing) return;

    // Cascade: soft-delete contained notes
    const noteIds = await db.notes.where("notebookId").equals(id).primaryKeys();
    await db.notes.bulkDelete(noteIds);

    await db.notebooks.delete(id);
  });
};

export const createNote = async (args: { notebookId: string; title: string; body?: string }) => {
  validateTitle(args.title);
  const now = Date.now();
  const id = generateLocalId();

  const note: LocalNote = {
    _id: id,
    notebookId: args.notebookId,
    title: args.title,
    body: args.body ?? "",
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.notes.add(note);
  return note;
};

export const updateNote = async (args: {
  id: string;
  title?: string;
  body?: string;
  notebookId?: string;
  archived?: boolean;
}) => {
  if (args.title !== undefined) validateTitle(args.title);
  const existing = await db.notes.get(args.id);
  if (!existing) throw new Error("Note not found");

  const now = Date.now();
  const patch: Partial<LocalNote> = { updatedAt: now };
  if (args.title !== undefined) patch.title = args.title;
  if (args.body !== undefined) patch.body = args.body;
  if (args.notebookId !== undefined) patch.notebookId = args.notebookId;
  if (args.archived !== undefined) {
    patch.archived = args.archived;
    patch.archivedAt = args.archived ? now : undefined;
  }

  await db.notes.update(args.id, patch);
};

export const deleteNote = async (id: string) => {
  const existing = await db.notes.get(id);
  if (!existing) return;
  await db.notes.delete(id);
};
