import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_BACKGROUND } from "./focus-background";
import { BUNDLED_TRACKS } from "./focus-tracks";

// Local UI preferences (per-device). Reactive via a window event so a change in
// Settings updates open dialogs/cards without a reload.
const DEFER_DATES_KEY = "voidsteps-defer-dates";
const DUE_DATES_KEY = "voidsteps-due-dates";
const PRIORITIZE_DEFAULT_KEY = "voidsteps-prioritize-default";
const STEP_ACTIONS_KEY = "voidsteps-step-actions";
const OPEN_FOCUS_ON_PLAY_KEY = "voidsteps-open-focus-on-play";
const SHOW_STEP_DATES_KEY = "voidsteps-show-step-dates";
const FONT_SCALE_KEY = "voidsteps-font-scale";
const FOCUS_BACKGROUND_KEY = "voidsteps-focus-background";
const FOCUS_AUDIO_KEY = "voidsteps-focus-audio";
const FOCUS_VOLUME_KEY = "voidsteps-focus-volume";
const FOCUS_TRACK_KEY = "voidsteps-focus-track";
const PREFS_EVENT = "voidsteps-prefs-changed";

// Per-action placement on a step: "open" = its own inline icon, "compact" =
// tucked into the step's "more" menu.
export type StepActionKey =
  "failed" | "timer" | "priority" | "postpone" | "time" | "open" | "edit" | "delete";
export type StepActionMode = "open" | "compact";
export type StepActionsConfig = Record<StepActionKey, StepActionMode>;

export const STEP_ACTION_LABELS: Record<StepActionKey, string> = {
  failed: "Mark failed",
  timer: "Timer",
  priority: "Prioritize",
  postpone: "Postpone to tomorrow",
  time: "Edit time",
  open: "Activity",
  edit: "Edit",
  delete: "Delete",
};
export const STEP_ACTION_ORDER: StepActionKey[] = [
  "timer",
  "priority",
  "postpone",
  "failed",
  "time",
  "open",
  "edit",
  "delete",
];

const DEFAULT_STEP_ACTIONS: StepActionsConfig = {
  failed: "open",
  timer: "open",
  priority: "open",
  postpone: "compact",
  time: "compact",
  open: "compact",
  edit: "compact",
  delete: "compact",
};

export function getStepActions(): StepActionsConfig {
  try {
    const raw = localStorage.getItem(STEP_ACTIONS_KEY);
    if (!raw) return { ...DEFAULT_STEP_ACTIONS };
    return { ...DEFAULT_STEP_ACTIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STEP_ACTIONS };
  }
}

export function setStepActionMode(key: StepActionKey, mode: StepActionMode): void {
  try {
    const next = { ...getStepActions(), [key]: mode };
    localStorage.setItem(STEP_ACTIONS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function useStepActions(): StepActionsConfig {
  const [cfg, setCfg] = useState(getStepActions);
  useEffect(() => {
    const handler = () => setCfg(getStepActions());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return cfg;
}

// What clicking a step row does, configurable per page. Steps page defaults to
// toggling priority; Today defaults to starting/stopping the timer.
export type StepClickAction = "prioritize" | "play" | "complete" | "open" | "none";
const STEPS_CLICK_ACTION_KEY = "voidsteps-steps-click-action";
const TODAY_CLICK_ACTION_KEY = "voidsteps-today-click-action";

function readClickAction(key: string, fallback: StepClickAction): StepClickAction {
  try {
    const v = localStorage.getItem(key);
    if (v === "prioritize" || v === "play" || v === "complete" || v === "open" || v === "none")
      return v;
    return fallback;
  } catch {
    return fallback;
  }
}

export function getStepsClickAction(): StepClickAction {
  return readClickAction(STEPS_CLICK_ACTION_KEY, "prioritize");
}
export function getTodayClickAction(): StepClickAction {
  return readClickAction(TODAY_CLICK_ACTION_KEY, "play");
}

export function setStepsClickAction(action: StepClickAction): void {
  try {
    localStorage.setItem(STEPS_CLICK_ACTION_KEY, action);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}
export function setTodayClickAction(action: StepClickAction): void {
  try {
    localStorage.setItem(TODAY_CLICK_ACTION_KEY, action);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

function useClickAction(read: () => StepClickAction): StepClickAction {
  const [action, setAction] = useState<StepClickAction>(read);
  useEffect(() => {
    const handler = () => setAction(read());
    window.addEventListener(PREFS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PREFS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [read]);
  return action;
}

export function useStepsClickAction(): StepClickAction {
  return useClickAction(getStepsClickAction);
}
export function useTodayClickAction(): StepClickAction {
  return useClickAction(getTodayClickAction);
}

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
    STEPS_CLICK_ACTION_KEY,
    TODAY_CLICK_ACTION_KEY,
    STEP_ACTIONS_KEY,
    DUE_DATES_KEY,
    DEFER_DATES_KEY,
    OPEN_FOCUS_ON_PLAY_KEY,
    SHOW_STEP_DATES_KEY,
    FONT_SCALE_KEY,
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

/** Whether the picked audio track loops while focus mode is open. Default off:
 * sound should never start playing because someone hit play on a timer. */
export function getFocusAudioOn(): boolean {
  try {
    return localStorage.getItem(FOCUS_AUDIO_KEY) === "true";
  } catch {
    return false;
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
    const raw = Number(localStorage.getItem(FOCUS_VOLUME_KEY));
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
