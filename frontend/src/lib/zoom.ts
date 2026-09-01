import { useEffect, useState } from "react";
import { isDesktop, setWebviewZoom } from "@/lib/platform";

// Whole-app zoom, per device. Distinct from the font scale in preferences.ts:
// that one scales rem-based type and layout, this one scales the rendered page
// the way a browser does, so px-sized things, the notes editor, the path canvas
// and images come along with it.
const ZOOM_KEY = "voidsteps-zoom";
const ZOOM_EVENT = "voidsteps-zoom-changed";

/**
 * The ladder browsers use, trimmed at both ends to what a 720x560 minimum
 * window can still show. Discrete steps rather than free scaling, so a
 * shortcut press always lands on a round percentage.
 */
export const ZOOM_LEVELS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
export const DEFAULT_ZOOM = 1;

/** Nearest level to an arbitrary number, so a hand-edited value can't wedge it. */
function snap(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ZOOM;
  return ZOOM_LEVELS.reduce((best, level) =>
    Math.abs(level - value) < Math.abs(best - value) ? level : best
  );
}

export function getZoom(): number {
  try {
    const raw = localStorage.getItem(ZOOM_KEY);
    if (raw === null) return DEFAULT_ZOOM;
    return snap(Number(raw));
  } catch {
    return DEFAULT_ZOOM;
  }
}

/** Push the stored zoom at the webview. Safe to call before React mounts. */
export function applyZoom(zoom: number = getZoom()): void {
  // Fire and forget: a failed zoom must never take the app down with it.
  void setWebviewZoom(zoom).catch(() => {});
}

export function setZoom(zoom: number): number {
  const next = snap(zoom);
  try {
    localStorage.setItem(ZOOM_KEY, String(next));
  } catch {
    /* ignore */
  }
  applyZoom(next);
  window.dispatchEvent(new Event(ZOOM_EVENT));
  return next;
}

/** Step up or down the ladder, clamped at the ends. Returns the new value. */
export function stepZoom(delta: number): number {
  const i = ZOOM_LEVELS.indexOf(getZoom());
  const next = ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, Math.max(0, i + delta))];
  return setZoom(next);
}

export function resetZoom(): number {
  return setZoom(DEFAULT_ZOOM);
}

export function formatZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/** True when zoom can actually do anything, ie. the packaged desktop shell. */
export function zoomSupported(): boolean {
  return isDesktop();
}

export function useZoom(): number {
  const [value, setValue] = useState(getZoom);
  useEffect(() => {
    const handler = () => setValue(getZoom());
    window.addEventListener(ZOOM_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(ZOOM_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}
