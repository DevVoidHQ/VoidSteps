import { useEffect, useState } from "react";
import { db, type LocalUserFont } from "./db";

/**
 * The UI typeface the user imported.
 *
 * The app ships Geist (SIL OFL) as its default because it cannot redistribute
 * Satoshi, the DevVoid brand face: Fontshare licenses it as proprietary
 * freeware that must not be carried in a repository. Importing lets a user
 * who owns Satoshi, or any other face, get their own look back without the
 * repo ever holding the file. The mechanics mirror focus-media.ts: a plain
 * `<input type="file">` because the desktop shell has no filesystem or dialog
 * plugin, the bytes held ourselves as a Blob so the choice survives the
 * original file moving or being deleted, and a CustomEvent so every consumer
 * of the font stays in sync without prop drilling.
 *
 * This row is NOT in SNAPSHOT_TABLES, for the same reason as focusMedia: it's
 * cosmetic and re-pickable, not worth carrying megabytes in every backup.
 */

const FONT_EVENT = "voidsteps-user-font-changed";
const FONT_UI_PROPERTY = "--font-ui";
const FONT_FALLBACK = "system-ui, sans-serif";
const VALID_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

function announce() {
  window.dispatchEvent(new CustomEvent(FONT_EVENT));
}

/**
 * "MyFont-Regular.woff2" -> "MyFont". Strips the extension plus one trailing
 * weight/style suffix, so the family name registered with the document reads
 * like a font name rather than a filename.
 */
function deriveFamilyName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const withoutSuffix = withoutExtension.replace(
    /[-_ ](regular|bold|italic|oblique|light|medium|semibold|black|thin|extralight|extrabold)$/i,
    ""
  );
  // The result is interpolated into a CSS custom property value, so anything
  // that could terminate the declaration has to go. A quote or comma in a
  // filename would otherwise produce a malformed property and drop the app
  // back to the default font with no explanation.
  const safe = withoutSuffix.replace(/[^A-Za-z0-9 _-]/g, "").trim();
  return safe || "Imported font";
}

function hasValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function setUserFont(file: File): Promise<void> {
  if (!hasValidExtension(file.name)) {
    throw new Error("That doesn't look like a font file (.woff2, .woff, .ttf, .otf).");
  }
  const family = deriveFamilyName(file.name);

  // Parse before persisting. Storing first and rendering later means a file
  // that is not really a font gets saved, reported as applied, and then fails
  // silently on this and every future launch, leaving the user looking at an
  // unchanged UI that Settings claims is using their font.
  const buffer = await file.arrayBuffer();
  try {
    await new FontFace(family, buffer).load();
  } catch {
    throw new Error("That file could not be read as a font.");
  }

  await db.userFonts.put({
    _id: "ui",
    blob: file,
    name: file.name,
    family,
    updatedAt: Date.now(),
  });
  announce();
  await applyUserFont();
}

export async function clearUserFont(): Promise<void> {
  await db.userFonts.delete("ui");
  announce();
  await applyUserFont();
}

export async function getUserFont(): Promise<LocalUserFont | undefined> {
  return db.userFonts.get("ui");
}

function removeInlineFont() {
  document.documentElement.style.removeProperty(FONT_UI_PROPERTY);
}

/**
 * The face currently registered with the document, so it can be removed
 * before the next one is added.
 *
 * Without this, every import leaves its decoded face resident in
 * document.fonts holding its own buffer, a cleared font stays resolvable by
 * name for the rest of the session, and re-importing the same file registers
 * a duplicate at the same family, weight and style, which makes font matching
 * depend on insertion order. focus-media.ts is careful about exactly this for
 * object URLs; the FontFace equivalent is document.fonts.delete.
 */
let registeredFace: FontFace | null = null;

function unregisterFace() {
  if (!registeredFace) return;
  try {
    document.fonts.delete(registeredFace);
  } catch {
    // Already gone, or the document is being torn down. Nothing to recover.
  }
  registeredFace = null;
}

/**
 * Registers the stored font with the document and points --font-ui at it.
 * A bad or missing row must never leave the UI unstyled, so any failure
 * just removes the inline property and lets the stylesheet default (Geist)
 * win.
 */
export async function applyUserFont(): Promise<void> {
  let row: LocalUserFont | undefined;
  try {
    row = await getUserFont();
  } catch {
    unregisterFace();
    removeInlineFont();
    return;
  }
  if (!row) {
    unregisterFace();
    removeInlineFont();
    return;
  }
  try {
    const buffer = await row.blob.arrayBuffer();
    const face = new FontFace(row.family, buffer);
    await face.load();
    unregisterFace();
    document.fonts.add(face);
    registeredFace = face;
    document.documentElement.style.setProperty(
      FONT_UI_PROPERTY,
      `"${row.family}", ${FONT_FALLBACK}`
    );
  } catch {
    unregisterFace();
    removeInlineFont();
  }
}

// Deliberately no module scope call here. main.tsx applies this alongside
// applyFontScale and applyZoom, before first paint, because a font swapped in
// after mount visibly reflows the whole UI.

/**
 * The imported font's name and family, for Settings to show what is picked.
 * Subscribes to the same CustomEvent pattern as focus-media.ts so the UI
 * updates the moment the font changes.
 */
export function useUserFont(): { name: string | null; family: string | null } {
  const [state, setState] = useState<{ name: string | null; family: string | null }>({
    name: null,
    family: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const row = await getUserFont();
      if (cancelled) return;
      setState({ name: row?.name ?? null, family: row?.family ?? null });
    };

    load();
    window.addEventListener(FONT_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(FONT_EVENT, load);
    };
  }, []);

  return state;
}
