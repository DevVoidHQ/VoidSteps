import { useEffect } from "react";
import { stepZoom, resetZoom, zoomSupported } from "@/lib/zoom";

// A trackpad pinch emits many small ctrl+wheel deltas, a mouse wheel a few
// large ones. Accumulating to a threshold gives both the same feel instead of
// racing up the ladder on a pinch.
const WHEEL_STEP_THRESHOLD = 30;

/**
 * Cmd/Ctrl with plus, minus or zero, plus Cmd/Ctrl and scroll: browser zoom,
 * behaving the way it does everywhere else.
 *
 * Deliberately fixed rather than routed through the rebindable keybind map,
 * and deliberately not the text-size control in Settings, which stays as its
 * own accessibility setting.
 *
 * Only mounted in the desktop shell. The browser build already has these
 * shortcuts natively and hijacking them there would only make zoom worse.
 */
export function useZoomShortcuts(): void {
  useEffect(() => {
    if (!zoomSupported()) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      // "=" is the unshifted key that carries "+" on most layouts.
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        stepZoom(1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        stepZoom(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };

    let accumulated = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      // The path canvas has its own zoom on the same gesture. Zooming both at
      // once compounds and feels broken, so inside it the canvas wins.
      const target = e.target as Element | null;
      if (target?.closest?.(".react-flow")) return;
      // Otherwise the webview zooms on its own as well and the two compound.
      e.preventDefault();
      accumulated += e.deltaY;
      while (Math.abs(accumulated) >= WHEEL_STEP_THRESHOLD) {
        // Scrolling up (negative delta) zooms in, as everywhere else.
        stepZoom(accumulated < 0 ? 1 : -1);
        accumulated -= Math.sign(accumulated) * WHEEL_STEP_THRESHOLD;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);
}
