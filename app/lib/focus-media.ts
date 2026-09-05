import { useEffect, useState } from "react";
import { db, type LocalFocusMedia } from "./db";

/**
 * Wallpaper and audio the user picked for focus mode.
 *
 * Files are read through a plain `<input type="file">` and stored as Blobs.
 * The desktop shell has no filesystem or dialog plugin (only `opener` and
 * `window-state`), so the web input is the path that needs no extra Rust
 * capability, and holding the bytes ourselves means the choice survives the
 * original file being moved or deleted.
 *
 * These rows are NOT in SNAPSHOT_TABLES, on purpose. See the v11 block in
 * db.ts.
 */

export type FocusMediaKind = LocalFocusMedia["_id"];

const MEDIA_EVENT = "voidsteps-focus-media-changed";

function announce() {
  window.dispatchEvent(new CustomEvent(MEDIA_EVENT));
}

export async function setFocusMedia(kind: FocusMediaKind, file: File): Promise<void> {
  await db.focusMedia.put({
    _id: kind,
    blob: file,
    name: file.name,
    updatedAt: Date.now(),
  });
  announce();
}

export async function clearFocusMedia(kind: FocusMediaKind): Promise<void> {
  await db.focusMedia.delete(kind);
  announce();
}

export async function getFocusMedia(kind: FocusMediaKind): Promise<LocalFocusMedia | undefined> {
  return db.focusMedia.get(kind);
}

/**
 * Object URL for a stored blob, revoked when it changes or the caller
 * unmounts. Returns the filename too, so Settings can show what is picked
 * without loading the blob a second time.
 *
 * Revoking matters here: a wallpaper is megabytes, and focus mode is opened
 * and closed many times a day.
 */
export function useFocusMedia(kind: FocusMediaKind): { url: string | null; name: string | null } {
  const [state, setState] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      const row = await getFocusMedia(kind);
      if (cancelled) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = row ? URL.createObjectURL(row.blob) : null;
      setState({ url: objectUrl, name: row?.name ?? null });
    };

    load();
    window.addEventListener(MEDIA_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(MEDIA_EVENT, load);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind]);

  return state;
}
