import { useSyncExternalStore } from "react";

/**
 * Which step card is open, app-wide. One at a time, like an accordion, so the
 * number keys always act on a single card. `reveal` asks the open card to
 * scroll itself into view and take focus once (set when opened from the
 * command bar, where the card may be off screen or on another page).
 */
interface State {
  openId: string | null;
  revealId: string | null;
}

let state: State = { openId: null, revealId: null };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function openStep(id: string, opts: { reveal?: boolean } = {}) {
  set({ openId: id, revealId: opts.reveal ? id : null });
}

export function closeStep() {
  set({ openId: null, revealId: null });
}

export function toggleStep(id: string) {
  if (state.openId === id) closeStep();
  else openStep(id);
}

/** Called by the card once it has scrolled into view. */
export function clearReveal() {
  if (state.revealId) set({ ...state, revealId: null });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether this step's card is open, and whether it should reveal itself. */
export function useStepExpansion(id: string): { open: boolean; reveal: boolean } {
  const open = useSyncExternalStore(subscribe, () => state.openId === id);
  const reveal = useSyncExternalStore(subscribe, () => state.revealId === id);
  return { open, reveal };
}
