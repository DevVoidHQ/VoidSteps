const STORAGE_KEY = "voidsteps-keybinds";

export interface KeybindMap {
  quickCreate: string;
  quickCreateRoutine: string;
  quickCreatePath: string;
  quickCreateReminder: string;
  toggleSidebar: string;
  navToday: string;
  navSteps: string;
  navPaths: string;
  navRoutines: string;
  navReminders: string;
  navNotes: string;
  navAnalytics: string;
  navSettings: string;
}

export const DEFAULT_KEYBINDS: KeybindMap = {
  quickCreate: "n",
  quickCreateRoutine: "r",
  quickCreatePath: "p",
  quickCreateReminder: "m",
  toggleSidebar: "meta+b",
  navToday: "1",
  navSteps: "2",
  navPaths: "3",
  navRoutines: "4",
  navReminders: "5",
  navNotes: "6",
  navAnalytics: "7",
  navSettings: "8",
};

export const KEYBIND_LABELS: Record<keyof KeybindMap, string> = {
  quickCreate: "New Step",
  quickCreateRoutine: "New Routine",
  quickCreatePath: "New Path",
  quickCreateReminder: "New Reminder",
  toggleSidebar: "Toggle Sidebar",
  navToday: "Go to Today",
  navSteps: "Go to Steps",
  navPaths: "Go to Paths",
  navRoutines: "Go to Routines",
  navReminders: "Go to Reminders",
  navNotes: "Go to Notes",
  navAnalytics: "Go to Analytics",
  navSettings: "Go to Settings",
};

function loadOverrides(): Partial<KeybindMap> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Partial<KeybindMap>) {
  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function getKeybinds(): KeybindMap {
  const overrides = loadOverrides();
  return { ...DEFAULT_KEYBINDS, ...overrides };
}

export function setKeybind(action: keyof KeybindMap, keybind: string) {
  const overrides = loadOverrides();
  if (keybind === DEFAULT_KEYBINDS[action]) {
    delete overrides[action];
  } else {
    overrides[action] = keybind;
  }
  saveOverrides(overrides);
}

export function resetKeybind(action: keyof KeybindMap) {
  const overrides = loadOverrides();
  delete overrides[action];
  saveOverrides(overrides);
}

export function resetAllKeybinds() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Check if a KeyboardEvent matches a keybind string.
 * Format: "meta+shift+k", "n", "escape", "meta+k"
 */
export function matchesKeybind(e: KeyboardEvent, keybind: string): boolean {
  const parts = keybind.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const needsMeta = parts.includes("meta");
  const needsCtrl = parts.includes("ctrl");
  const needsShift = parts.includes("shift");
  const needsAlt = parts.includes("alt");

  // meta matches both metaKey (Mac) and ctrlKey (Windows/Linux)
  const metaPressed = e.metaKey || e.ctrlKey;

  if (needsMeta && !metaPressed) return false;
  if (needsCtrl && !e.ctrlKey) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsAlt && !e.altKey) return false;

  // If no modifier required, make sure none are pressed (except for ctrl+key combos)
  if (!needsMeta && !needsCtrl && (e.metaKey || e.ctrlKey)) return false;
  if (!needsShift && e.shiftKey) return false;
  if (!needsAlt && e.altKey) return false;

  return e.key.toLowerCase() === key;
}

/**
 * Convert a keybind string to display format.
 * "meta+k" → "⌘K" (Mac) or "Ctrl+K" (other)
 */
export function formatKeybindDisplay(keybind: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts = keybind.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  const modMap: Record<string, string> = isMac
    ? { meta: "⌘", ctrl: "⌃", shift: "⇧", alt: "⌥" }
    : { meta: "Ctrl+", ctrl: "Ctrl+", shift: "Shift+", alt: "Alt+" };

  const modStr = modifiers.map((m) => modMap[m] || "").join("");
  const keyStr = key === "escape" ? "Esc" : key.toUpperCase();

  return `${modStr}${keyStr}`;
}

/**
 * Convert a KeyboardEvent to a keybind string for recording.
 */
export function eventToKeybind(e: KeyboardEvent): string | null {
  const key = e.key.toLowerCase();

  // Ignore standalone modifier presses
  if (["meta", "control", "shift", "alt"].includes(key)) return null;

  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("meta");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  parts.push(key);

  return parts.join("+");
}
