// Single source of truth for plan -> feature gating. Pure + dependency-free so
// BOTH Convex (server enforcement) and the React client (UX gates) import it.
// Flip parity by editing the tables below; nothing else changes.
//
// Paywall philosophy: Free is a genuinely complete but LOCAL-ONLY tracker
// (paths/steps/routines/reminders/timer/graph + 2 themes, all on-device, no
// cloud). Pro/Lifetime unlocks cloud sync + backup + cross-device, plus Notes,
// Analytics, and full theming. "Sync at all" is the core paywall.

export type Plan = "free" | "pro" | "lifetime";

// Boolean capabilities. Add a key here = a new flag everywhere it's read.
export type Feature =
  | "sync" // cloud sync + backup at all (Free is fully local-only)
  | "notes" // notebooks + notes (the only server-synced gated entity)
  | "analytics" // analytics & history page (client-derived)
  | "history" // extended activity-log retention (Free keeps a rolling window)
  | "themes.custom"; // custom theme editor + import + AI prompt (cosmetic)

const FEATURES: Record<Feature, readonly Plan[]> = {
  sync: ["pro", "lifetime"],
  notes: ["pro", "lifetime"],
  analytics: ["pro", "lifetime"],
  history: ["pro", "lifetime"],
  "themes.custom": ["pro", "lifetime"],
};

// Local activity-log retention window by history entitlement. Timer/time
// entries (the actual timesheet data) are never pruned - this only bounds the
// append-only audit log.
export const ACTIVITY_RETENTION_DAYS_FREE = 60;
export const ACTIVITY_RETENTION_DAYS_PRO = 365;

// Preset themes a Free user may apply. Everything else in themePresets is Pro.
// Keep the brand default in here so Free never looks broken.
export const FREE_THEMES = ["devvoid", "dark"] as const;

/** Normalize whatever is in Clerk publicMetadata into a known Plan. */
export function planOf(meta: unknown): Plan {
  const p = (meta as { plan?: unknown } | null | undefined)?.plan;
  return p === "pro" || p === "lifetime" ? p : "free";
}

/** Does this plan have access to a boolean feature? */
export function can(plan: Plan, feature: Feature): boolean {
  return FEATURES[feature].includes(plan);
}

/** May this plan apply the given preset theme by name? */
export function canUseTheme(plan: Plan, presetName: string): boolean {
  return plan !== "free" || (FREE_THEMES as readonly string[]).includes(presetName);
}
