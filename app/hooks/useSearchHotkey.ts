import { useEffect, type RefObject } from "react";

/**
 * Make Cmd/Ctrl+F focus an in-page search input instead of the browser's find.
 * Only attach this on pages that actually have a search bar.
 */
export function useSearchHotkey(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key === "f" || e.key === "F")
      ) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [ref]);
}
