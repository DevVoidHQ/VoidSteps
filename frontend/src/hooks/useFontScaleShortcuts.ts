import { useEffect } from "react";
import { setFontScale, stepFontScale } from "@/lib/preferences";

/**
 * Cmd/Ctrl with plus, minus or zero, the same shortcuts every other app uses
 * for this. Deliberately fixed rather than routed through the rebindable
 * keybind map: someone who cannot read the interface should not have to find
 * the keybind settings to make it readable.
 */
export function useFontScaleShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      // "=" is the unshifted key that carries "+" on most layouts.
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        stepFontScale(1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        stepFontScale(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        setFontScale("default");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
