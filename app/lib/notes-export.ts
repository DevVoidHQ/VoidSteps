import { strToU8, zipSync } from "fflate";
import { db, type LocalNote, type LocalNotebook, type LocalPath } from "./db";

/**
 * Notes leave the app as Markdown: a zip with one folder per notebook and one
 * file per note. The notes feature is gone from the UI, but the data is kept
 * and this export stays in Settings > Data until the notes are deleted.
 */

export interface ExportFile {
  path: string;
  content: string;
}

/** A name safe on macOS, Windows and Linux, never empty. */
export function safeName(name: string, fallback: string): string {
  const cleaned = Array.from(name, (ch) => (ch.charCodeAt(0) < 32 ? " " : ch))
    .join("")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 100)
    .trim();
  return cleaned || fallback;
}

/** "Name", "Name 2", "Name 3" within one folder. */
function unique(name: string, taken: Set<string>): string {
  let candidate = name;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${name} ${n}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

const iso = (ts: number) => new Date(ts).toISOString();
const yamlString = (s: string) => JSON.stringify(s);

/**
 * Builds the file list. `toMarkdown` turns a stored body (BlockNote JSON, or
 * Markdown from before the editor switch) into Markdown; it is passed in so
 * this stays pure and testable without the editor.
 */
export function buildNoteFiles(
  notebooks: LocalNotebook[],
  notes: LocalNote[],
  paths: LocalPath[],
  toMarkdown: (body: string) => string
): ExportFile[] {
  const files: ExportFile[] = [];
  const folders = new Set<string>();
  const pathTitle = new Map(paths.map((p) => [p._id, p.title]));
  const byNotebook = new Map<string, LocalNote[]>();
  for (const note of notes) {
    byNotebook.set(note.notebookId, [...(byNotebook.get(note.notebookId) ?? []), note]);
  }
  const known = new Set(notebooks.map((n) => n._id));
  const orphans = notes.filter((n) => !known.has(n.notebookId));
  const groups: { title: string; notes: LocalNote[] }[] = [
    ...notebooks.map((nb) => ({ title: nb.title, notes: byNotebook.get(nb._id) ?? [] })),
    ...(orphans.length ? [{ title: "Unfiled", notes: orphans }] : []),
  ];

  for (const group of groups) {
    const folder = unique(safeName(group.title, "Notebook"), folders);
    const names = new Set<string>();
    for (const note of group.notes) {
      const file = unique(safeName(note.title, "Untitled"), names);
      const linked = (note as LocalNote & { pathId?: string }).pathId;
      const header = [
        "---",
        `title: ${yamlString(note.title || "Untitled")}`,
        `created: ${iso(note.createdAt)}`,
        `updated: ${iso(note.updatedAt)}`,
        ...(linked && pathTitle.has(linked) ? [`path: ${yamlString(pathTitle.get(linked)!)}`] : []),
        ...(note.archived ? ["archived: true"] : []),
        "---",
        "",
      ].join("\n");
      const body = toMarkdown(note.body ?? "").trim();
      files.push({
        path: `${folder}/${file}.md`,
        content: `${header}# ${note.title || "Untitled"}\n\n${body}\n`,
      });
    }
  }
  return files;
}

export function zipFiles(files: ExportFile[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((f) => [f.path, strToU8(f.content)])));
}

/**
 * Reads every notebook and note and returns the zip. The BlockNote editor is
 * loaded only here, so it costs nothing until someone exports.
 */
export async function exportNotesZip(): Promise<{ data: Uint8Array; count: number }> {
  const [notebooks, notes, paths] = await Promise.all([
    db.notebooks.toArray(),
    db.notes.toArray(),
    db.paths.toArray(),
  ]);
  const { BlockNoteEditor } = await import("@blocknote/core");
  const editor = BlockNoteEditor.create();

  const toMarkdown = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed.startsWith("[")) return trimmed; // stored as Markdown already
    try {
      const blocks = JSON.parse(trimmed);
      return Array.isArray(blocks) ? editor.blocksToMarkdownLossy(blocks) : trimmed;
    } catch {
      return trimmed;
    }
  };

  return {
    data: zipFiles(buildNoteFiles(notebooks, notes, paths, toMarkdown)),
    count: notes.length,
  };
}
