import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getKeybinds, matchesKeybind } from "@/lib/keybind-config";

const NAV_ACTIONS = [
  "navToday",
  "navSteps",
  "navPaths",
  "navRoutines",
  "navReminders",
  "navNotes",
  "navAnalytics",
  "navSettings",
] as const;

const NAV_ROUTES: Record<string, string> = {
  navToday: "/",
  navSteps: "/steps",
  navPaths: "/paths",
  navRoutines: "/routines",
  navReminders: "/reminders",
  navNotes: "/notes",
  navAnalytics: "/analytics",
  navSettings: "/settings",
};

interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onQuickAdd?: () => void;
  onQuickAddRoutine?: () => void;
  onQuickAddPath?: () => void;
  onQuickAddReminder?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const keybinds = getKeybinds();

      // Toggle sidebar
      if (matchesKeybind(e, keybinds.toggleSidebar)) {
        e.preventDefault();
        handlers.onToggleSidebar?.();
        return;
      }

      // Escape
      if (e.key === "Escape") {
        handlers.onEscape?.();
        return;
      }

      // Skip remaining shortcuts when inside inputs
      if (isInput) return;

      // Quick create
      if (matchesKeybind(e, keybinds.quickCreate)) {
        e.preventDefault();
        handlers.onQuickAdd?.();
        return;
      }

      // Quick create routine
      if (matchesKeybind(e, keybinds.quickCreateRoutine)) {
        e.preventDefault();
        handlers.onQuickAddRoutine?.();
        return;
      }

      // Quick create path
      if (matchesKeybind(e, keybinds.quickCreatePath)) {
        e.preventDefault();
        handlers.onQuickAddPath?.();
        return;
      }

      // Quick create reminder
      if (matchesKeybind(e, keybinds.quickCreateReminder)) {
        e.preventDefault();
        handlers.onQuickAddReminder?.();
        return;
      }

      // Page navigation
      for (const action of NAV_ACTIONS) {
        if (matchesKeybind(e, keybinds[action])) {
          e.preventDefault();
          navigate(NAV_ROUTES[action]);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers, navigate]);
}
