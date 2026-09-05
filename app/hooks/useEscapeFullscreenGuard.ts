import { useEffect } from "react";

/**
 * Stops macOS leaving full screen on Escape.
 *
 * AppKit routes an unhandled Escape to NSWindow's cancelOperation:, which for a
 * full-screen window means "leave full screen". WebKit only forwards the key up
 * the responder chain when the page did not handle it, so marking every Escape
 * as handled keeps the window where it is. Propagation is left alone, so the
 * app's own Escape handling still runs.
 */
export function useEscapeFullscreenGuard() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
