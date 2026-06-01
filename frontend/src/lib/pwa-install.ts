import { useSyncExternalStore } from "react";

// The browser fires `beforeinstallprompt` once, early in page life. We capture
// and stash it so an in-app "Install" button can trigger it on demand. Imported
// for its side effect from main.tsx so the listener is attached before render.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

/** True when the app is already running as an installed PWA. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => deferredPrompt;

/**
 * Reactive install state. `canInstall` is true only when the browser has
 * offered an install prompt (Chromium desktop/Android). Returns a function to
 * trigger it; resolves to the user's choice or null if unavailable.
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
} {
  const prompt = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      deferredPrompt = null;
      emit();
    }
    return choice.outcome;
  };

  return { canInstall: !!prompt, promptInstall };
}
