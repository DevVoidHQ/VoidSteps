import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getAutoUpdateCheck } from "./preferences";
import { reportError } from "./error-store";

// The update check is the only network call VoidSteps makes, and it is made
// from the Rust side by tauri-plugin-updater rather than by the webview, so
// the app's CSP stays closed to every origin (see csp-enforced.test.ts).
//
// One module-level store rather than per-component state: the banner and the
// Settings card both drive the same check, and two independent hooks would
// mean two requests and two answers that can disagree.

const LAST_CHECK_KEY = "voidsteps-update-last-check";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type UpdaterStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "current" }
  | { phase: "available"; update: Update }
  | { phase: "installing"; version: string; percent: number | null }
  | { phase: "error"; message: string };

let status: UpdaterStatus = { phase: "idle" };
const listeners = new Set<() => void>();

function set(next: UpdaterStatus) {
  status = next;
  for (const listener of listeners) listener();
}

/** True inside the packaged desktop app. In a plain browser (vite dev, tests)
 * the plugin has no IPC to talk to and every call would throw. */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readLastCheck(): number {
  try {
    return Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastCheck(at: number) {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(at));
  } catch {
    /* ignore */
  }
}

/**
 * Ask GitHub whether a newer release exists.
 *
 * `manual` is the Settings button: it ignores both the automatic-checks
 * preference and the once-a-day throttle, because someone who clicked "check
 * for updates" is owed an answer rather than a cached silence.
 */
export async function runUpdateCheck(manual = false): Promise<void> {
  if (!isDesktop()) return;
  if (status.phase === "checking" || status.phase === "installing") return;
  if (!manual) {
    if (!getAutoUpdateCheck()) return;
    if (Date.now() - readLastCheck() < CHECK_INTERVAL_MS) return;
  }

  set({ phase: "checking" });
  try {
    const update = await check();
    writeLastCheck(Date.now());
    set(update ? { phase: "available", update } : { phase: "current" });
  } catch (error) {
    // A failed check must never be louder than this. The app opens and works
    // offline, and a task tracker that greets you with a network error dialog
    // has broken its own promise.
    await reportError("network", error, { action: "updateCheck" });
    set({
      phase: "error",
      message: error instanceof Error ? error.message : "Could not check for updates.",
    });
  }
}

/** Download, verify, install, relaunch. Everything after the download is the
 * plugin's; the app only reports progress and gets out of the way. */
export async function installUpdate(): Promise<void> {
  if (status.phase !== "available") return;
  const { update } = status;
  let downloaded = 0;
  let total: number | null = null;

  set({ phase: "installing", version: update.version, percent: null });
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? null;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        set({
          phase: "installing",
          version: update.version,
          percent: total ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
        });
      }
    });
    await relaunch();
  } catch (error) {
    await reportError("network", error, { action: "installUpdate", version: update.version });
    set({
      phase: "error",
      message: error instanceof Error ? error.message : "Could not install the update.",
    });
  }
}

/** Back to idle, so a dismissed banner does not come back until the next check. */
export function dismissUpdate(): void {
  set({ phase: "idle" });
}

export function useUpdaterStatus(): UpdaterStatus {
  const [value, setValue] = useState(status);
  useEffect(() => {
    const listener = () => setValue(status);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return value;
}
