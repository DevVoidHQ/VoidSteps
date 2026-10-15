import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { redo, undo } from "@/lib/undo";

/** Text editing keeps its own undo: inputs, textareas and the notes editor. */
function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

/**
 * Undo and redo with the toast that says what happened. Shared by the
 * keyboard shortcut and the command bar so both report the same way.
 */
export function useUndoActions() {
  const toast = useToast();
  const busy = useRef(false);

  const run = useCallback(
    async (direction: "undo" | "redo") => {
      if (busy.current) return;
      busy.current = true;
      try {
        const result = await (direction === "undo" ? undo() : redo());
        const verb = direction === "undo" ? "Undone" : "Redone";
        if (result.status === "done") toast.success(`${verb}: ${result.label}`);
        else if (result.status === "empty") toast.info(`Nothing to ${direction}`);
        else toast.error(`Can't ${direction} "${result.label}": it changed since`);
      } catch (error) {
        await reportError("mutation", error, { action: direction });
        toast.error(direction === "undo" ? "Undo failed" : "Redo failed");
      } finally {
        busy.current = false;
      }
    },
    [toast]
  );

  return {
    undo: useCallback(() => run("undo"), [run]),
    redo: useCallback(() => run("redo"), [run]),
  };
}

/**
 * Cmd+Z undoes the last action anywhere in the app and Shift+Cmd+Z redoes it,
 * except while typing, where the keys keep their text meaning.
 */
export function useUndoShortcuts() {
  const { undo: runUndo, redo: runRedo } = useUndoActions();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "z") return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      void (e.shiftKey ? runRedo() : runUndo());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [runUndo, runRedo]);
}
