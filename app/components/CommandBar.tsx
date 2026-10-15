import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ListTodo,
  Target,
  Zap,
  Bell,
  BarChart3,
  Settings,
  Search,
  Plus,
  PanelLeft,
  Keyboard,
  ChevronRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { getKeybinds, formatKeybindDisplay, type KeybindMap } from "@/lib/keybind-config";
import type { Step } from "@/types/index";
import { useReturnFocus } from "@/components/ui/Dialog";

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
  /** A rebindable shortcut from Settings, shown beside the entry. */
  keybindKey?: keyof KeybindMap;
  /** A fixed shortcut (e.g. "meta+z"), for actions Settings does not rebind. */
  shortcut?: string;
  icon?: LucideIcon;
  run: () => void;
}

interface Entry {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  keybindKey?: keyof KeybindMap;
  shortcut?: string;
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
  toggleShortcuts: Keyboard,
};

// Navigation destinations. Mirrors the sidebar order.
const NAV: {
  label: string;
  path: string;
  icon: LucideIcon;
  keybindKey?: keyof KeybindMap;
  keywords?: string;
}[] = [
  { label: "Today", path: "/", icon: Calendar, keybindKey: "navToday", keywords: "calendar focus" },
  {
    label: "Steps",
    path: "/steps",
    icon: ListTodo,
    keybindKey: "navSteps",
    keywords: "tasks todo",
  },
  {
    label: "Paths",
    path: "/paths",
    icon: Target,
    keybindKey: "navPaths",
    keywords: "goals projects",
  },
  { label: "Routines", path: "/routines", icon: Zap, keybindKey: "navRoutines" },
  { label: "Reminders", path: "/reminders", icon: Bell, keybindKey: "navReminders" },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
    keybindKey: "navAnalytics",
    keywords: "stats charts",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    keybindKey: "navSettings",
    keywords: "preferences keybinds",
  },
];

export default function CommandBar({
  open,
  onOpenChange,
  actions = [],
  steps = [],
  buildStepActions,
  onOpenStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: CommandAction[];
  /** Searchable steps. Enter opens the step's card; → drills into its actions. */
  steps?: Step[];
  buildStepActions?: (step: Step) => StepAction[];
  onOpenStep?: (step: Step) => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // The step being acted on, once you drill into one.
  const [drilled, setDrilled] = useState<Step | null>(null);
  const [armedConfirm, setArmedConfirm] = useState<string | null>(null);
  const onCloseAutoFocus = useReturnFocus(open);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const entries = useMemo<Entry[]>(() => {
    const actionEntries: Entry[] = actions.map((a) => ({
      id: `action:${a.keybindKey ?? a.label}`,
      label: a.label,
      icon: a.icon ?? (a.keybindKey && ACTION_ICONS[a.keybindKey]) ?? Plus,
      group: "Actions",
      keybindKey: a.keybindKey,
      shortcut: a.shortcut,
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
          run: onOpenStep
            ? () => {
                close();
                onOpenStep(step);
              }
            : () => setDrilled(step),
        }))
      : [];

    return [...navEntries, ...actionEntries, ...stepEntries];
  }, [actions, navigate, close, steps, buildStepActions, onOpenStep]);

  const results = useMemo(() => {
    if (drilled && buildStepActions) {
      const q = query.trim().toLowerCase();
      return buildStepActions(drilled)
        .filter((a) => !q || a.label.toLowerCase().includes(q))
        .map<Entry>((a) => ({
          id: a.id,
          label: armedConfirm === a.id ? `${a.label}, press enter again` : a.label,
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

  // Keep the highlighted row visible. The list scrolls (max-h-80) but the
  // highlight is pure state, so without this you navigate a selection you
  // cannot see and Enter runs whatever it landed on.
  //
  // "nearest" rather than "center": it scrolls only when the row is actually
  // out of view, so the list does not lurch on every keypress.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // A new query is a new list, so the first result is selected. This also
  // keeps the scroll honest: the effect above then pulls the top row into
  // view, rather than leaving the container scrolled past a stale selection.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Drilling resets activeIndex to 0 too, but it may already BE 0, in which
  // case the effect above never fires and a scrolled list stays scrolled.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
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
    }
  };

  let lastGroup = "";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[15vh]">
          <DialogPrimitive.Overlay className="absolute inset-0 bg-black/60 animate-in fade-in-0 duration-150" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-popover shadow-elev-3 outline-none animate-in zoom-in-95 fade-in-0 duration-150"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={(e) => {
              // Escape steps back out of a step before it closes the palette.
              if (drilled) {
                e.preventDefault();
                setDrilled(null);
              }
              // Either way the app's other Escape handlers stay out of it.
              e.stopPropagation();
            }}
          >
            <VisuallyHidden.Root asChild>
              <DialogPrimitive.Title>Command bar</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="flex items-center gap-2 px-4">
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
                <span className="flex max-w-[45%] shrink-0 items-center gap-1 rounded bg-muted px-2 py-1 type-meta text-muted-foreground">
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
                className="h-12 w-full bg-transparent type-prompt text-foreground placeholder:text-muted-foreground focus:!outline-none focus-visible:!outline-none"
              />
            </div>

            <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center type-body text-muted-foreground">
                  No results
                </li>
              ) : (
                results.map((item, i) => {
                  const Icon = item.icon;
                  const active = i === activeIndex;
                  const kb = item.keybindKey ? keybinds[item.keybindKey] : (item.shortcut ?? "");
                  const showHeader = item.group !== lastGroup;
                  lastGroup = item.group;
                  return (
                    <li key={item.id} ref={active ? activeRef : undefined}>
                      {showHeader && (
                        <div className="px-3 pb-1 pt-2 type-overline text-muted-foreground/70">
                          {item.group}
                        </div>
                      )}
                      <button
                        role="option"
                        aria-selected={active}
                        onClick={item.run}
                        onMouseMove={() => setActiveIndex(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left type-body transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.step && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                        {kb && (
                          <kbd
                            className={`hidden sm:inline-flex h-5 items-center rounded px-1.5 type-kbd ${
                              active
                                ? "bg-primary-foreground/10 text-primary-foreground"
                                : "bg-field text-muted-foreground"
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

            <div className="mt-1 px-4 py-2 type-meta text-muted-foreground/70">
              {drilled
                ? "↑↓ action · enter run · ← back · esc back"
                : "↑↓ move · enter open · → step actions · esc close"}
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
