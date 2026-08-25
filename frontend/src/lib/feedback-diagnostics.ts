import { db } from "./db";

// Sanitized environment snapshot attached to bug reports. Counts and flags only
// - never Path / Step / Note titles or bodies. Safe to send and store.
export type FeedbackDiagnostics = {
  mode: string;
  userAgent: string;
  language: string;
  errorLogCount: number;
  capturedAt: number;
};

export async function collectDiagnostics(): Promise<FeedbackDiagnostics> {
  let errorLogCount = 0;
  try {
    errorLogCount = await db.errorLog.count();
  } catch {
    // Dexie unavailable / not yet open - diagnostics are best-effort.
  }

  return {
    mode: import.meta.env.MODE,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    errorLogCount,
    capturedAt: Date.now(),
  };
}
