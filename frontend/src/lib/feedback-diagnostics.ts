import { db } from "./db";
import { isStandalone } from "./pwa-install";

// Sanitized environment snapshot attached to bug reports. Counts and flags only
// - never Path / Step / Note titles or bodies. Safe to send and store.
export type FeedbackDiagnostics = {
  mode: string;
  online: boolean;
  standalone: boolean;
  userAgent: string;
  language: string;
  syncPending: number;
  syncFailed: number;
  errorLogCount: number;
  capturedAt: number;
};

export async function collectDiagnostics(): Promise<FeedbackDiagnostics> {
  let syncPending = 0;
  let syncFailed = 0;
  let errorLogCount = 0;
  try {
    syncPending = await db.syncQueue.where("status").equals("pending").count();
    syncFailed = await db.syncQueue.where("status").equals("failed").count();
    errorLogCount = await db.errorLog.count();
  } catch {
    // Dexie unavailable / not yet open - diagnostics are best-effort.
  }

  return {
    mode: import.meta.env.MODE,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    standalone: isStandalone(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    syncPending,
    syncFailed,
    errorLogCount,
    capturedAt: Date.now(),
  };
}
