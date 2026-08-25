import { useEffect, useState } from "react";

// Local UI preferences (per-device). Reactive via a window event so a change in
// Settings updates open dialogs/cards without a reload.
export const DEFER_DATES_KEY = "voidsteps-defer-dates";
export const DUE_DATES_KEY = "voidsteps-due-dates";
export const PRIORITIZE_DEFAULT_KEY = "voidsteps-prioritize-default";
export const STEP_ACTIONS_KEY = "voidsteps-step-actions";
export const OPEN_FOCUS_ON_PLAY_KEY = "voidsteps-open-focus-on-play";
export const SHOW_STEP_DATES_KEY = "voidsteps-show-step-dates";
const PREFS_EVENT = "voidsteps-prefs-changed";

// Per-action placement on a step: "open" = its own inline icon, "compact" =
// tucked into the step's "more" menu.
export type StepActionKey = "failed" | "timer" | "priority" | "time" | "open" | "edit" | "delete";
export type StepActionMode = "open" | "compact";
export type StepActionsConfig = Record<StepActionKey, StepActionMode>;

export const STEP_ACTION_LABELS: Record<StepActionKey, string> = {
  failed: "Mark failed",
  timer: "Timer",
  priority: "Prioritize",
  time: "Edit time",
  open: "Activity",
  edit: "Edit",
  delete: "Delete",
};
export const STEP_ACTION_ORDER: StepActionKey[] = ["timer", "priority", "failed", "time", "open", "edit", "delete"];

const DEFAULT_STEP_ACTIONS: StepActionsConfig = {
  failed: "open",
  timer: "open",
  priority: "open",
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
export const STEPS_CLICK_ACTION_KEY = "voidsteps-steps-click-action";
export const TODAY_CLICK_ACTION_KEY = "voidsteps-today-click-action";

function readClickAction(key: string, fallback: StepClickAction): StepClickAction {
  try {
    const v = localStorage.getItem(key);
    if (v === "prioritize" || v === "play" || v === "complete" || v === "open" || v === "none") return v;
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
  ];
  try {
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}
