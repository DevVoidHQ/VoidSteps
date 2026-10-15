import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Path, Step } from "@/types/index";
import { useData } from "./DataContext";
import { useClock } from "@/hooks/useClock";
import {
  EMPTY_LENS,
  isLensActive,
  lensPathIds,
  parseLens,
  stepInLens,
  type Lens,
  type SavedLens,
} from "@/lib/lens";

const ACTIVE_ID_KEY = "voidsteps-active-lens";
const SAVED_KEY = "voidsteps-saved-lenses";
// Earlier shapes, folded in once: the unsaved app-wide filter, and before that
// the per-page path filter shared by Today and Steps.
const OLD_ADHOC_KEY = "voidsteps-lens";
const LEGACY_PATH_FILTER_KEY = "voidsteps-path-filter";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const newId = () => `lens-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Saved lenses plus the active one, migrating older filter shapes once. */
function initialState(): { saved: SavedLens[]; activeId: string | null } {
  const stored = readJson(SAVED_KEY);
  const saved: SavedLens[] = Array.isArray(stored)
    ? stored
        .filter((s) => s && typeof s.id === "string" && typeof s.name === "string")
        .map((s) => ({ id: s.id, name: s.name, lens: parseLens(s.lens) }))
    : [];
  let activeId: string | null = null;
  try {
    const id = localStorage.getItem(ACTIVE_ID_KEY);
    activeId = id && saved.some((s) => s.id === id) ? id : null;

    const migrate = (name: string, lens: Lens) => {
      const lensed = { id: newId(), name, lens };
      saved.push(lensed);
      activeId = lensed.id;
    };
    // Read only; the old keys are removed after the result is saved (see the
    // provider). This runs twice under StrictMode, so it must not mutate.
    const adhoc = readJson(OLD_ADHOC_KEY);
    if (adhoc !== undefined) {
      const lens = parseLens(adhoc);
      if (isLensActive(lens)) migrate("My filter", lens);
    }
    const legacy = localStorage.getItem(LEGACY_PATH_FILTER_KEY);
    if (legacy) migrate("Path filter", { ...EMPTY_LENS, pathIds: [legacy] });
  } catch {
    /* ignore */
  }
  return { saved, activeId };
}

interface LensContextValue {
  saved: SavedLens[];
  /** The lens the app is in, or null for Everything. */
  activeId: string | null;
  /** The filter of the active lens (empty for Everything). */
  lens: Lens;
  active: boolean;
  activate: (id: string | null) => void;
  /** Creates an empty lens and returns its id. */
  create: () => string;
  update: (id: string, patch: { name?: string; lens?: Lens }) => void;
  remove: (id: string) => void;
}

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [init] = useState(initialState);
  const [saved, setSaved] = useState<SavedLens[]>(init.saved);
  const [activeId, setActiveId] = useState<string | null>(init.activeId);

  useEffect(() => {
    writeJson(SAVED_KEY, saved);
    // Saved, so the shapes migrated in initialState can go.
    try {
      localStorage.removeItem(OLD_ADHOC_KEY);
      localStorage.removeItem(LEGACY_PATH_FILTER_KEY);
    } catch {
      /* ignore */
    }
  }, [saved]);
  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(ACTIVE_ID_KEY, activeId);
      else localStorage.removeItem(ACTIVE_ID_KEY);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  const create = useCallback(() => {
    const id = newId();
    setSaved((list) => [...list, { id, name: "New lens", lens: { ...EMPTY_LENS } }]);
    return id;
  }, []);

  const value = useMemo<LensContextValue>(() => {
    const current = saved.find((s) => s.id === activeId);
    const lens = current?.lens ?? EMPTY_LENS;
    return {
      saved,
      activeId: current ? current.id : null,
      lens,
      active: isLensActive(lens),
      activate: setActiveId,
      create,
      update: (id, patch) =>
        setSaved((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))),
      remove: (id) => {
        setSaved((list) => list.filter((s) => s.id !== id));
        setActiveId((current) => (current === id ? null : current));
      },
    };
  }, [saved, activeId, create]);

  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used within LensProvider");
  return ctx;
}

/**
 * useData seen through the lens. Views that show data use this; places that
 * must see everything (duplicate detection, running timers, pickers that move
 * a step to another path) keep useData.
 *
 * Paths outside the lens are dropped, and a kept path whose parent was dropped
 * is shown as a top-level path so the graph and lists still have a root.
 */
export function useLensedData() {
  const data = useData();
  const { lens, active } = useLens();
  const now = useClock();
  // Day granularity is enough for due buckets; avoids refiltering every tick.
  const today = new Date(now).setHours(0, 0, 0, 0);

  return useMemo(() => {
    if (!active) return { ...data, lensActive: false as const };
    const pathIds = lensPathIds(lens, data.paths ?? []);
    const keep = (steps: Step[] | undefined) =>
      steps?.filter((s) => stepInLens(s, lens, pathIds, Date.now()));
    const keepPaths = (paths: Path[] | undefined) => {
      if (!paths || !pathIds) return paths;
      return paths
        .filter((p) => pathIds.has(p._id))
        .map((p) => (p.parentId && !pathIds.has(p.parentId) ? { ...p, parentId: undefined } : p));
    };
    return {
      ...data,
      lensActive: true as const,
      allSteps: keep(data.allSteps),
      activeSteps: keep(data.activeSteps),
      failedSteps: keep(data.failedSteps),
      completedStepsToday: keep(data.completedStepsToday),
      upcomingSteps: keep(data.upcomingSteps),
      activePaths: keepPaths(data.activePaths),
      archivedPaths: keepPaths(data.archivedPaths),
      rootPaths: keepPaths(data.rootPaths),
      routines: pathIds
        ? data.routines?.filter((r) => r.pathId && pathIds.has(r.pathId))
        : data.routines,
    };
    // `today` re-runs the filter when the day turns over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lens, active, today]);
}
