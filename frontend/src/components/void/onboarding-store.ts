import { TUTORIAL_IDS } from "./tour-script";

// Persistent onboarding progress. Tracks which tutorials are done, which (if
// any) is currently running, and whether we've made the new-vs-existing-user
// decision yet.
export interface OnboardingProgress {
  completed: string[];
  active: { tutorialId: string; step: number } | null;
  decided: boolean;
}

const KEY = "voidsteps-onboarding";
const DEFAULT: OnboardingProgress = { completed: [], active: null, decided: false };

/** Fired whenever progress changes so hooks can re-read in the same tab. */
export const ONBOARDING_EVENT = "voidsteps:onboarding-changed";

export function readOnboarding(): OnboardingProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<OnboardingProgress>;
    return {
      completed: Array.isArray(p.completed) ? p.completed : [],
      active: p.active ?? null,
      decided: !!p.decided,
    };
  } catch {
    return { ...DEFAULT };
  }
}

function write(p: OnboardingProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
}

export function isAllComplete(p: OnboardingProgress): boolean {
  return TUTORIAL_IDS.every((id) => p.completed.includes(id));
}

/** Record the new-vs-existing decision once. Existing users (with data) are
 * marked fully complete so they're never forced into onboarding. */
export function decideOnboarding(existingUser: boolean): void {
  const p = readOnboarding();
  if (p.decided) return;
  write({ completed: existingUser ? [...TUTORIAL_IDS] : [], active: null, decided: true });
}

export function startTutorial(tutorialId: string): void {
  const p = readOnboarding();
  write({ ...p, active: { tutorialId, step: 0 } });
}

export function setActiveStep(step: number): void {
  const p = readOnboarding();
  if (!p.active) return;
  write({ ...p, active: { ...p.active, step } });
}

export function stopTutorial(): void {
  const p = readOnboarding();
  write({ ...p, active: null });
}

export function completeTutorial(tutorialId: string): void {
  const p = readOnboarding();
  const completed = p.completed.includes(tutorialId) ? p.completed : [...p.completed, tutorialId];
  write({ ...p, completed, active: null });
}

/** Clear all tutorial progress. Keeps `decided` so we don't re-run the
 * new-vs-existing-user check; the user simply starts the tutorials over. */
export function resetOnboarding(): void {
  write({ completed: [], active: null, decided: true });
}
