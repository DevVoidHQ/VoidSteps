import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PAGE_ROUTES = [
  "/",
  "/steps",
  "/paths",
  "/routines",
  "/analytics",
  "/pathway",
  "/settings",
];

interface ShortcutHandlers {
  onTogglePalette?: () => void;
  onToggleSidebar?: () => void;
  onQuickAdd?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd/Ctrl+K - command palette
      if (isMod && e.key === "k") {
        e.preventDefault();
        handlers.onTogglePalette?.();
        return;
      }

      // Cmd/Ctrl+B - sidebar toggle
      if (isMod && e.key === "b") {
        e.preventDefault();
        handlers.onToggleSidebar?.();
        return;
      }

      // Cmd/Ctrl+N - quick add
      if (isMod && e.key === "n") {
        e.preventDefault();
        handlers.onQuickAdd?.();
        return;
      }

      // Escape
      if (e.key === "Escape") {
        handlers.onEscape?.();
        return;
      }

      // Number keys 1-7 for page navigation (only when not in input)
      if (!isInput && !isMod && e.key >= "1" && e.key <= "7") {
        const idx = parseInt(e.key) - 1;
        if (idx < PAGE_ROUTES.length) {
          navigate(PAGE_ROUTES[idx]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers, navigate]);
}
