import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_BACKGROUND } from "./focus-background";
import { BUNDLED_TRACKS } from "./focus-tracks";

// Local UI preferences (per-device). Reactive via a window event so a change in
// Settings updates open dialogs/cards without a reload.
const DEFER_DATES_KEY = "voidsteps-defer-dates";
const DUE_DATES_KEY = "voidsteps-due-dates";
const PRIORITIZE_DEFAULT_KEY = "voidsteps-prioritize-default";
const OPEN_FOCUS_ON_PLAY_KEY = "voidsteps-open-focus-on-play";
const POSTPONE_DEPRIORITIZES_KEY = "voidsteps-postpone-deprioritizes";
const TIMER_BAR_HIDDEN_KEY = "voidsteps-timer-bar-hidden";
const AUTO_UPDATE_CHECK_KEY = "voidsteps-auto-update-check";
const SHOW_STEP_DATES_KEY = "voidsteps-show-step-dates";
const FONT_SCALE_KEY = "voidsteps-font-scale";
const FOCUS_BACKGROUND_KEY = "voidsteps-focus-background";
const FOCUS_AUDIO_KEY = "voidsteps-focus-audio";
const FOCUS_VOLUME_KEY = "voidsteps-focus-volume";
const FOCUS_TRACK_KEY = "voidsteps-focus-track";
const PREFS_EVENT = "voidsteps-prefs-changed";

// Whether new steps default to "Prioritize for today". Default off.
export function getPrioritizeDefault(): boolean {
  try {
    return localStorage.getItem(PRIORITIZE_DEFAULT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setPrioritizeDefault(on: boolean): void {
  try {
    localStorage.setItem(PRIORITIZE_DEFAULT_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

// Whether moving a step's due date past today also drops it from Today.
// Default on.
export function getPostponeDeprioritizes(): boolean {
  try {
    const v = localStorage.getItem(POSTPONE_DEPRIORITIZES_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setPostponeDeprioritizes(on: boolean): void {
  try {
    localStorage.setItem(POSTPONE_DEPRIORITIZES_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

// Whether starting a step's timer (play) opens the fullscreen focus view.
// Default on.
export function getOpenFocusOnPlay(): boolean {
  try {
    const v = localStorage.getItem(OPEN_FOCUS_ON_PLAY_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setOpenFocusOnPlay(on: boolean): void {
  try {
    localStorage.setItem(OPEN_FOCUS_ON_PLAY_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useOpenFocusOnPlay(): boolean {
  const [value, setValue] = useState(getOpenFocusOnPlay);
  useEffect(() => {
    const handler = () => setValue(getOpenFocusOnPlay());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// Whether the running-timer bar is hidden outright. Distinct from collapsing
// it to a pill: this removes it from the screen entirely, for the case where a
// timer should run without anything on top of the work. The timers keep
// running and the step cards still show them; only the floating bar goes.
// Off by default, and reachable again from Settings so it cannot be lost.
export function getTimerBarHidden(): boolean {
  try {
    return localStorage.getItem(TIMER_BAR_HIDDEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function setTimerBarHidden(hidden: boolean): void {
  try {
    localStorage.setItem(TIMER_BAR_HIDDEN_KEY, String(hidden));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useTimerBarHidden(): boolean {
  const [value, setValue] = useState(getTimerBarHidden);
  useEffect(() => {
    const handler = () => setValue(getTimerBarHidden());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// Whether the app checks GitHub for a new release on its own. Default on: an
// install that never hears about a fix drifts to whatever version it shipped
// with. This is the only network call VoidSteps makes, so turning it off makes
// the app entirely offline again, which is why the switch exists at all.
export function getAutoUpdateCheck(): boolean {
  try {
    const v = localStorage.getItem(AUTO_UPDATE_CHECK_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setAutoUpdateCheck(on: boolean): void {
  try {
    localStorage.setItem(AUTO_UPDATE_CHECK_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useAutoUpdateCheck(): boolean {
  const [value, setValue] = useState(getAutoUpdateCheck);
  useEffect(() => {
    const handler = () => setValue(getAutoUpdateCheck());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// Whether step cards show a footer with created / last-updated dates.
// Default on.
export function getShowStepDates(): boolean {
  try {
    const v = localStorage.getItem(SHOW_STEP_DATES_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setShowStepDates(on: boolean): void {
  try {
    localStorage.setItem(SHOW_STEP_DATES_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useShowStepDates(): boolean {
  const [value, setValue] = useState(getShowStepDates);
  useEffect(() => {
    const handler = () => setValue(getShowStepDates());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// Where a date field appears: nowhere, edit only, or both create+edit.
export type DeferDatesMode = "off" | "edit" | "both";

export function getDeferDatesMode(): DeferDatesMode {
  try {
    const v = localStorage.getItem(DEFER_DATES_KEY);
    if (v === "edit" || v === "both") return v;
    if (v === "true") return "both"; // migrate old boolean value
    return "off";
  } catch {
    return "off";
  }
}

export function setDeferDatesMode(mode: DeferDatesMode): void {
  try {
    localStorage.setItem(DEFER_DATES_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

// Due date mode - defaults to "both" (shown when creating and editing).
export function getDueDatesMode(): DeferDatesMode {
  try {
    const v = localStorage.getItem(DUE_DATES_KEY);
    if (v === "off" || v === "edit" || v === "both") return v;
    return "both";
  } catch {
    return "both";
  }
}

export function setDueDatesMode(mode: DeferDatesMode): void {
  try {
    localStorage.setItem(DUE_DATES_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

function useMode(read: () => DeferDatesMode): DeferDatesMode {
  const [mode, setMode] = useState<DeferDatesMode>(read);
  useEffect(() => {
    const handler = () => setMode(read());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [read]);
  return mode;
}

/** Reactive read of the defer-dates mode. Default "off". */
export function useDeferDatesMode(): DeferDatesMode {
  return useMode(getDeferDatesMode);
}

/** Reactive read of the due-dates mode. Default "both". */
export function useDueDatesMode(): DeferDatesMode {
  return useMode(getDueDatesMode);
}

/** Reset every General-tab preference back to its default. */
// Base type size. Everything is rem-based, so this scales the whole interface
// rather than only the text, which is what makes it actually readable instead
// of just larger words in the same small boxes.
export type FontScale = "small" | "default" | "large" | "larger";

export const FONT_SCALE_PX: Record<FontScale, number> = {
  small: 14,
  default: 16,
  large: 18,
  larger: 20,
};

export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  small: "Small",
  default: "Default",
  large: "Large",
  larger: "Larger",
};

export const FONT_SCALE_ORDER: FontScale[] = ["small", "default", "large", "larger"];

export function getFontScale(): FontScale {
  try {
    const v = localStorage.getItem(FONT_SCALE_KEY);
    return v && v in FONT_SCALE_PX ? (v as FontScale) : "default";
  } catch {
    return "default";
  }
}

/** Write the scale to the document. Safe to call before React mounts. */
export function applyFontScale(scale: FontScale = getFontScale()): void {
  document.documentElement.style.setProperty("--app-font-size", `${FONT_SCALE_PX[scale]}px`);
}

export function setFontScale(scale: FontScale): void {
  try {
    localStorage.setItem(FONT_SCALE_KEY, scale);
  } catch {
    /* ignore */
  }
  applyFontScale(scale);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/** Step the text size up or down, clamped at the ends. Returns the new value. */
export function stepFontScale(delta: number): FontScale {
  const i = FONT_SCALE_ORDER.indexOf(getFontScale());
  const next = FONT_SCALE_ORDER[Math.min(FONT_SCALE_ORDER.length - 1, Math.max(0, i + delta))];
  setFontScale(next);
  return next;
}

export function useFontScale(): FontScale {
  const [value, setValue] = useState(getFontScale);
  useEffect(() => {
    const handler = () => setValue(getFontScale());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

export function resetGeneralPreferences(): void {
  const keys = [
    PRIORITIZE_DEFAULT_KEY,
    POSTPONE_DEPRIORITIZES_KEY,
    DUE_DATES_KEY,
    DEFER_DATES_KEY,
    OPEN_FOCUS_ON_PLAY_KEY,
    SHOW_STEP_DATES_KEY,
    FONT_SCALE_KEY,
    SIDEBAR_RAIL_KEY,
  ];
  try {
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  applyFontScale();
  window.dispatchEvent(new Event(PREFS_EVENT));
}

// ── focus mode ──────────────────────────────────────────────────────
// Which generated background the focus view uses, or "custom" for the image
// the user picked. Stored by id, never as CSS, so a preset can be retuned
// without migrating anyone's setting.

export function getFocusBackground(): string {
  try {
    return localStorage.getItem(FOCUS_BACKGROUND_KEY) ?? DEFAULT_FOCUS_BACKGROUND;
  } catch {
    return DEFAULT_FOCUS_BACKGROUND;
  }
}

export function setFocusBackground(id: string): void {
  try {
    localStorage.setItem(FOCUS_BACKGROUND_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useFocusBackground(): string {
  const [value, setValue] = useState(getFocusBackground);
  useEffect(() => {
    const handler = () => setValue(getFocusBackground());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

/** Whether the picked track plays while a timer runs or focus mode is open.
 * Default on, reversing an earlier "sound should never start because someone
 * hit play on a timer": music you have to go and find is music nobody uses.
 * The off switch stays one click away in the focus view, never only here. */
export function getFocusAudioOn(): boolean {
  try {
    const v = localStorage.getItem(FOCUS_AUDIO_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setFocusAudioOn(on: boolean): void {
  try {
    localStorage.setItem(FOCUS_AUDIO_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useFocusAudioOn(): boolean {
  const [value, setValue] = useState(getFocusAudioOn);
  useEffect(() => {
    const handler = () => setValue(getFocusAudioOn());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

export function getFocusVolume(): number {
  try {
    // Number(null) is 0, so an unset volume must be caught before parsing or
    // a fresh install starts silent.
    const stored = localStorage.getItem(FOCUS_VOLUME_KEY);
    const raw = stored === null || stored.trim() === "" ? NaN : Number(stored);
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
  } catch {
    return 0.5;
  }
}

export function setFocusVolume(v: number): void {
  try {
    localStorage.setItem(FOCUS_VOLUME_KEY, String(v));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/** Reactive volume. The <audio> element and the fullscreen slider that drives
 * it live in different components, so the element needs to hear the change. */
export function useFocusVolume(): number {
  const [value, setValue] = useState(getFocusVolume);
  useEffect(() => {
    const handler = () => setValue(getFocusVolume());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

/** Which track focus mode plays: a bundled track id, or "custom" for the file
 * the user picked. Defaults to the first bundled track so a fresh install has
 * sound available without picking anything. */
export function getFocusTrack(): string {
  try {
    return localStorage.getItem(FOCUS_TRACK_KEY) ?? BUNDLED_TRACKS[0].id;
  } catch {
    return BUNDLED_TRACKS[0].id;
  }
}

export function setFocusTrack(id: string): void {
  try {
    localStorage.setItem(FOCUS_TRACK_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useFocusTrack(): string {
  const [value, setValue] = useState(getFocusTrack);
  useEffect(() => {
    const handler = () => setValue(getFocusTrack());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// Whether the keyboard shortcuts panel is docked open on the right. Open by
// default, so the shortcuts are discoverable; closing it is remembered.
const SHORTCUTS_PANEL_KEY = "voidsteps-shortcuts-panel";

export function getShortcutsPanelOpen(): boolean {
  try {
    return localStorage.getItem(SHORTCUTS_PANEL_KEY) !== "false";
  } catch {
    return true;
  }
}

// Whether a closed sidebar leaves an icon rail behind. Off by default: closing
// hides it completely, and a small button in the corner brings it back.
const SIDEBAR_RAIL_KEY = "voidsteps-sidebar-rail";

export function getSidebarRail(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_RAIL_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSidebarRail(on: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_RAIL_KEY, String(on));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useSidebarRail(): boolean {
  const [value, setValue] = useState(getSidebarRail);
  useEffect(() => {
    const handler = () => setValue(getSidebarRail());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return value;
}

// How each side panel was last closed. Closed from the keyboard, it comes back
// from the keyboard and leaves nothing on screen; closed with a click, a small
// handle stays in the corner so the mouse can bring it back.
export type PanelCloseSource = "keyboard" | "mouse";
const PANEL_CLOSED_BY_KEY = {
  sidebar: "voidsteps-sidebar-closed-by",
  shortcuts: "voidsteps-shortcuts-closed-by",
};

export function getPanelClosedBy(panel: "sidebar" | "shortcuts"): PanelCloseSource {
  try {
    return localStorage.getItem(PANEL_CLOSED_BY_KEY[panel]) === "mouse" ? "mouse" : "keyboard";
  } catch {
    return "keyboard";
  }
}

export function setPanelClosedBy(panel: "sidebar" | "shortcuts", source: PanelCloseSource): void {
  try {
    localStorage.setItem(PANEL_CLOSED_BY_KEY[panel], source);
  } catch {
    /* ignore */
  }
}

export function setShortcutsPanelOpen(open: boolean): void {
  try {
    localStorage.setItem(SHORTCUTS_PANEL_KEY, String(open));
  } catch {
    /* ignore */
  }
}
