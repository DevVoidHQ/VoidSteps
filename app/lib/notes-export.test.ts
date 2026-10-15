import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { LocalNote, LocalNotebook, LocalPath } from "./db";
import { buildNoteFiles, safeName, zipFiles } from "./notes-export";

const nb = (id: string, title: string) =>
  ({ _id: id, title, createdAt: 0, updatedAt: 0 }) as LocalNotebook;
const note = (id: string, notebookId: string, title: string, body = "", over = {}) =>
  ({ _id: id, notebookId, title, body, createdAt: 0, updatedAt: 86400000, ...over }) as LocalNote;

describe("notes export", () => {
  it("makes safe, non-empty names", () => {
    expect(safeName('a/b:c*"d', "x")).toBe("a b c d");
    expect(safeName("  ...  ", "Untitled")).toBe("Untitled");
  });

  it("writes one file per note in notebook folders, with a header and title", () => {
    const files = buildNoteFiles(
      [nb("n1", "Work")],
      [note("a", "n1", "Plan", "body", { pathId: "p1" })],
      [{ _id: "p1", title: "Launch" } as LocalPath],
      (b) => b.toUpperCase()
    );
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("Work/Plan.md");
    expect(files[0].content).toContain('title: "Plan"');
    expect(files[0].content).toContain('path: "Launch"');
    expect(files[0].content).toContain("# Plan\n\nBODY\n");
  });

  it("keeps same-named notes apart and files orphans under Unfiled", () => {
    const files = buildNoteFiles(
      [nb("n1", "Work")],
      [note("a", "n1", "Ideas"), note("b", "n1", "ideas"), note("c", "gone", "Lost")],
      [],
      (b) => b
    );
    expect(files.map((f) => f.path)).toEqual([
      "Work/Ideas.md",
      "Work/ideas 2.md",
      "Unfiled/Lost.md",
    ]);
  });

  it("zips files that unzip back to the same text", () => {
    const zip = zipFiles([{ path: "A/b.md", content: "# héllo" }]);
    expect(strFromU8(unzipSync(zip)["A/b.md"])).toBe("# héllo");
  });
});

describe("exportNotesZip", () => {
  it("converts real BlockNote documents to Markdown", async () => {
    const { db } = await import("./db");
    const { exportNotesZip } = await import("./notes-export");
    await db.notebooks.add(nb("n1", "Work"));
    await db.notes.add(
      note(
        "a",
        "n1",
        "Plan",
        JSON.stringify([
          { type: "heading", props: { level: 2 }, content: "Goals" },
          { type: "bulletListItem", content: "Ship v1" },
        ])
      )
    );
    await db.notes.add(note("b", "n1", "Old", "Plain *markdown* body"));
    const { data, count } = await exportNotesZip();
    const files = unzipSync(data);
    expect(count).toBe(2);
    const plan = strFromU8(files["Work/Plan.md"]);
    expect(plan).toContain("## Goals");
    expect(plan).toMatch(/[*-] Ship v1/);
    expect(strFromU8(files["Work/Old.md"])).toContain("Plain *markdown* body");
    await Promise.all(db.tables.map((t) => t.clear()));
  });
});
