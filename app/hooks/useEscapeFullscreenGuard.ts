import { useEffect } from "react";

/**
 * Stops macOS leaving full screen on Escape.
 *
 * AppKit routes an unhandled Escape to NSWindow's cancelOperation:, which for a
 * full-screen window means "leave full screen". WebKit only forwards the key up
 * the responder chain when the page did not handle it, so marking every Escape
 * as handled keeps the window where it is.
 *
 * This listens in the bubble phase on purpose. A capture listener on window
 * runs before everything else, and marking the key handled there made every
 * component that checks defaultPrevented (Radix dialogs included) ignore
 * Escape, so dialogs never closed in the desktop app.
 */
export function useEscapeFullscreenGuard() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
