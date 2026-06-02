import type { VoidState } from "./VoidOrb";

/** Live counts the tour gates on (derived from DataContext). Gates compare the
 * current value against a baseline captured when the step started, so a step
 * only completes when the user performs a NEW action, which makes tours work on
 * replay even when the account already has data. */
export interface GateData {
  paths: number;
  nested: number;
  steps: number;
  stepsWithPath: number;
  prioritized: number;
  completed: number;
}

export interface TourStep {
  id: string;
  /** hero = centered modal card; key = docked card; coachmark = spotlight anchor. */
  kind: "hero" | "key" | "coachmark";
  title: string;
  body: string;
  orbState: VoidState;
  /** Keycap shown on `key` steps (omit for a drag/gesture step). */
  keycap?: string;
  /** Coachmark anchor selector. */
  target?: string;
  /** Advance once the user navigates to this route themselves (no redirect). */
  reachRoute?: string;
  /** Auto-advance when this returns true. Gate on the delta from `base`. */
  gate?: (cur: GateData, base: GateData) => boolean;
  /** Button label for hero steps. */
  cta?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}

// Tutorial 1: set up your goals (command palette, Paths, nesting). Keyboard-first.
const PATHS_TUTORIAL: TourStep[] = [
  {
    id: "welcome",
    kind: "hero",
    title: "Hi, I'm Void.",
    body: "VoidSteps is keyboard-first. Let me show you a few keystrokes to set up your first goals. Takes about a minute.",
    orbState: "talking",
    cta: "Show me",
  },
  {
    id: "open-palette",
    kind: "key",
    keycap: "⌘K",
    reachRoute: "/paths",
    title: "Open the command palette",
    body: "Press ⌘K to open the command palette. It's how you get anywhere fast. Search for \"Paths\" and open it.",
    orbState: "talking",
  },
  {
    id: "create-path",
    kind: "key",
    keycap: "P",
    title: "Create two Paths",
    body: "Into Travel? Want to grow your Career? Press P and make a Path for each. A Path is a major part of your life.",
    orbState: "talking",
    gate: (cur, base) => cur.paths >= base.paths + 2,
  },
  {
    id: "nest-path",
    kind: "key",
    title: "Nest related Paths",
    body: "Focusing on a specific role in your Career? Make that a Path too (press P), then drag its node on top of Career to nest it.",
    orbState: "thinking",
    gate: (cur, base) => cur.nested > base.nested,
  },
  {
    id: "paths-done",
    kind: "hero",
    title: "Nice, your map is taking shape.",
    body: "Paths are the big areas of your life. Next up: turning a Path into something you actually do.",
    orbState: "celebrate",
    cta: "Finish",
  },
];

// Tutorial 2: add work and focus it (steps, prioritize, complete).
const STEPS_TUTORIAL: TourStep[] = [
  {
    id: "go-steps",
    kind: "key",
    keycap: "⌘K",
    reachRoute: "/steps",
    title: "Head to Steps",
    body: "Press ⌘K again and open \"Steps\". This is where the actual to-dos live.",
    orbState: "talking",
  },
  {
    id: "create-step",
    kind: "key",
    keycap: "N",
    title: "Add a Step to a Path",
    body: "Press N for New Step. Type a task, choose one of your Paths, then press Enter.",
    orbState: "talking",
    gate: (cur, base) => cur.stepsWithPath > base.stepsWithPath,
  },
  {
    id: "prioritize",
    kind: "key",
    title: "Star one for today",
    body: "Tap the star on any step to prioritize it. Starred steps jump to your Today page so you stay focused.",
    orbState: "talking",
    gate: (cur, base) => cur.prioritized > base.prioritized,
  },
  {
    id: "complete",
    kind: "key",
    title: "Check one off",
    body: "Tick a step's checkbox to complete it. That's the whole loop.",
    orbState: "thinking",
    gate: (cur, base) => cur.completed > base.completed,
  },
  {
    id: "steps-done",
    kind: "hero",
    title: "You've got the loop.",
    body: "Path, Step, prioritize, done, all from the keyboard. You're set. Routines, reminders and notes are in the sidebar when you want them.",
    orbState: "celebrate",
    cta: "Finish",
  },
];

export const TUTORIALS: Tutorial[] = [
  {
    id: "paths",
    title: "Map your life into Paths",
    description: "Use the command palette, create your first Paths, and nest related ones.",
    steps: PATHS_TUTORIAL,
  },
  {
    id: "steps",
    title: "Add and focus your work",
    description: "Create a Step under a Path, prioritize it for today, and complete it.",
    steps: STEPS_TUTORIAL,
  },
];

export const TUTORIAL_IDS = TUTORIALS.map((t) => t.id);

export function getTutorial(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}
