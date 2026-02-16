/**
 * Centralized design tokens for consistent styling across VoidSteps.
 * Import these constants instead of hardcoding classes.
 */

export const TYPOGRAPHY = {
  pageTitle: "text-2xl font-bold tracking-tight",
  sectionTitle: "text-base font-semibold",
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  body: "text-sm",
  caption: "text-xs text-muted-foreground",
} as const;

export const SPACING = {
  page: "space-y-8",
  section: "space-y-4",
  list: "space-y-2",
  tight: "space-y-1",
} as const;

export const CARD_PADDING = "p-4" as const;

export const STEP_STATES = {
  completed: "opacity-50",
  failed: "border-destructive/50",
  active: "",
} as const;

export const GRID = {
  paths: "grid grid-cols-1 md:grid-cols-2 gap-3",
  cards: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
} as const;
