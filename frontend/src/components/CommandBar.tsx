import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ListTodo,
  Target,
  Zap,
  Bell,
  BookOpen,
  BarChart3,
  Settings,
  Search,
  Plus,
  PanelLeft,
  ChevronRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { getKeybinds, formatKeybindDisplay, type KeybindMap } from "@/lib/keybind-config";
import type { Step } from "@/types/index";

/** One thing that can be done to a step, offered after drilling into it. */
export interface StepAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
  /** Ask for a second Enter before running. */
  confirm?: boolean;
}

/** App action commands provided by the parent (create dialogs, sidebar, …). */
export interface CommandAction {
  label: string;
  keybindKey: keyof KeybindMap;
  run: () => void;
}

interface Entry {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  keybindKey?: keyof KeybindMap;
  run: () => void;
  keywords?: string;
  /** Set on step rows, which drill in rather than run. */
  step?: Step;
}

const ACTION_ICONS: Partial<Record<keyof KeybindMap, LucideIcon>> = {
  quickCreate: Plus,
  quickCreateRoutine: Plus,
  quickCreatePath: Plus,
  quickCreateReminder: Plus,
  toggleSidebar: PanelLeft,
};

// Navigation destinations. Mirrors the sidebar order.
const NAV: { label: string; path: string; icon: LucideIcon; keybindKey?: keyof KeybindMap; keywords?: string }[] = [
  { label: "Today", path: "/", icon: Calendar, keybindKey: "navToday", keywords: "calendar focus" },
  { label: "Steps", path: "/steps", icon: ListTodo, keybindKey: "navSteps", keywords: "tasks todo" },
  { label: "Paths", path: "/paths", icon: Target, keybindKey: "navPaths", keywords: "goals projects" },
  { label: "Routines", path: "/routines", icon: Zap, keybindKey: "navRoutines" },
  { label: "Reminders", path: "/reminders", icon: Bell, keybindKey: "navReminders" },
  { label: "Notes", path: "/notes", icon: BookOpen, keybindKey: "navNotes" },
  { label: "Analytics", path: "/analytics", icon: BarChart3, keybindKey: "navAnalytics", keywords: "stats charts" },
  { label: "Settings", path: "/settings", icon: Settings, keybindKey: "navSettings", keywords: "preferences keybinds" },
];

export default function CommandBar({
  open,
  onOpenChange,
  actions = [],
  steps = [],
  buildStepActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: CommandAction[];
  /** Searchable steps. Picking one drills into its actions. */
  steps?: Step[];
  buildStepActions?: (step: Step) => StepAction[];
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // The step being acted on, once you drill into one.
  const [drilled, setDrilled] = useState<Step | null>(null);
  const [armedConfirm, setArmedConfirm] = useState<string | null>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const entries = useMemo<Entry[]>(() => {
    const actionEntries: Entry[] = actions.map((a) => ({
      id: `action:${a.keybindKey}`,
      label: a.label,
      icon: ACTION_ICONS[a.keybindKey] ?? Plus,
      group: "Actions",
      keybindKey: a.keybindKey,
      run: () => {
        a.run();
        close();
      },
    }));
    const navEntries: Entry[] = NAV.map((n) => ({
      id: `nav:${n.path}`,
      label: n.label,
      icon: n.icon,
      group: "Go to",
      keybindKey: n.keybindKey,
      keywords: n.keywords,
      run: () => {
        navigate(n.path);
        close();
      },
    }));
    const stepEntries: Entry[] = buildStepActions
      ? steps.map((step) => ({
          id: `step:${step._id}`,
          label: step.title,
          icon: ListTodo,
          group: "Steps",
          keywords: step.path?.title ?? "",
          step,
          run: () => setDrilled(step),
        }))
      : [];

    return [...navEntries, ...actionEntries, ...stepEntries];
  }, [actions, navigate, close, steps, buildStepActions]);

  const results = useMemo(() => {
    if (drilled && buildStepActions) {
      const q = query.trim().toLowerCase();
      return buildStepActions(drilled)
        .filter((a) => !q || a.label.toLowerCase().includes(q))
        .map<Entry>((a) => ({
          id: a.id,
          label: armedConfirm === a.id ? `${a.label} — press enter again` : a.label,
          icon: a.icon,
          group: drilled.title,
          run: () => {
            if (a.confirm && armedConfirm !== a.id) {
              setArmedConfirm(a.id);
              return;
            }
            a.run();
            close();
          },
        }));
    }

    const q = query.trim().toLowerCase();
    if (!q) return entries.filter((e) => e.group !== "Steps");
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.keywords?.toLowerCase().includes(q)
    );
  }, [query, entries, drilled, buildStepActions, armedConfirm, close]);

  const keybinds = useMemo<KeybindMap>(() => getKeybinds(), [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setDrilled(null);
    setArmedConfirm(null);
    const id = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Entering or leaving a step starts a fresh list.
  useEffect(() => {
    setQuery("");
    setActiveIndex(0);
    setArmedConfirm(null);
  }, [drilled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[activeIndex]?.run();
    } else if (e.key === "ArrowRight" && !query && results[activeIndex]?.step) {
      e.preventDefault();
      setDrilled(results[activeIndex].step!);
    } else if (e.key === "ArrowLeft" && !query && drilled) {
      e.preventDefault();
      setDrilled(null);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Escape steps back out of a step before it closes the palette.
      if (drilled) setDrilled(null);
      else close();
    }
  };

  if (!open) return null;

  let lastGroup = "";

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[15vh]"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-150" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command bar"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in-0 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          {drilled ? (
            <button
              type="button"
              aria-label="Back to search"
              onClick={() => setDrilled(null)}
              className="flex shrink-0 items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}

          {drilled && (
            <span className="flex max-w-[45%] shrink-0 items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              <ListTodo className="h-3 w-3 shrink-0" />
              <span className="truncate">{drilled.title}</span>
            </span>
          )}

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={drilled ? "Do what?" : "Search steps and commands…"}
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:!outline-none focus-visible:!outline-none"
          />
        </div>

        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results</li>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              const active = i === activeIndex;
              const kb = item.keybindKey ? keybinds[item.keybindKey] : "";
              const showHeader = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {showHeader && (
                    <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {item.group}
                    </div>
                  )}
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={item.run}
                    onMouseMove={() => setActiveIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.step && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                    {kb && (
                      <kbd
                        className={`hidden sm:inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] ${
                          active
                            ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
                            : "border-border bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {formatKeybindDisplay(kb)}
                      </kbd>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground/70">
          {drilled
            ? "↑↓ action · enter run · ← back · esc back"
            : "↑↓ move · enter pick · → step actions · esc close"}
        </div>
      </div>
    </div>,
    document.body
  );
}
