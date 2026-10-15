import { EVERYTHING_DIGIT, lensDigit, lensForDigit } from "@/lib/lens";
import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { openStep } from "@/lib/expanded-step";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import QuickCapture from "./QuickCapture";
import GlobalTimerBar from "./GlobalTimerBar";
import TimerReconcileGuard from "./TimerReconcileGuard";
import UpdateBanner from "./UpdateBanner";
import CommandBar from "./CommandBar";
import ShortcutsPanel from "./ShortcutsPanel";
import { useLens, useLensedData } from "@/contexts/LensContext";
import {
  getPanelClosedBy,
  getShortcutsPanelOpen,
  setPanelClosedBy,
  type PanelCloseSource,
  setShortcutsPanelOpen,
  useSidebarRail,
  useTimerBarHidden,
} from "@/lib/preferences";
import { Button } from "@/components/ui/Button";
import {
  CalendarClock,
  Check,
  Filter,
  FilterX,
  History,
  Menu,
  Pencil,
  Play,
  Redo2,
  Star,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { POSTPONE_TARGETS, resolvePostponeDate } from "@/lib/postpone";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUndoActions, useUndoShortcuts } from "@/hooks/useUndoShortcuts";
import { StepDialog, type StepDialogTab } from "./StepDialog";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import {
  useDeleteStep,
  useStartTimer,
  useStopTimer,
  useToggleStepCompletion,
  useToggleStepFailed,
  useUpdateStep,
} from "@/lib/local-mutations";
import type { Step } from "@/types/index";
import type { StepAction } from "./CommandBar";

/** Two quiet dots in a bottom corner that reopen a panel closed by click. */
function ReopenHandle({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`fixed bottom-4 z-40 hidden items-center gap-1 rounded-full px-2.5 py-2 text-muted-foreground opacity-60 transition hover:bg-surface-2 hover:opacity-100 hover:shadow-elev-2 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </button>
  );
}

const SIDEBAR_COLLAPSED_KEY = "voidsteps-sidebar-collapsed";

function getInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

// Page frames. "reading" centres lists you read: an 800px reading area on
// each row plus the row's actions after it, with headers and filters on the
// same axis. "wide" is for spatial pages (graph, month, day log, analytics).
// "full" hands the whole area to the page (Notes has its own panes).
export type PageWidth = "reading" | "wide" | "full";

const PAGE_WIDTH_CLASS: Record<Exclude<PageWidth, "full">, string> = {
  reading: "max-w-[68rem]",
  wide: "max-w-7xl",
};

export default function Layout({
  children,
  width = "reading",
}: {
  children: React.ReactNode;
  width?: PageWidth;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const keepRail = useSidebarRail();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isQuickCreateRoutineOpen, setIsQuickCreateRoutineOpen] = useState(false);
  const [isQuickCreatePathOpen, setIsQuickCreatePathOpen] = useState(false);
  const [isQuickCreateReminderOpen, setIsQuickCreateReminderOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  // A step reached through the command bar, and which of its dialogs is open.
  const [paletteStep, setPaletteStep] = useState<{
    step: Step;
    view: StepDialogTab | "time";
  } | null>(null);

  const { activePaths, runningTimerStepIds } = useData();
  // The running-timer bar floats over the top of the page on desktop. Reserve
  // room for it so it never covers the filter bar or page titles.
  const timerBarHidden = useTimerBarHidden();
  const reserveTimerBar = runningTimerStepIds.length > 0 && !timerBarHidden;
  // The command bar searches what the lens shows.
  const { activeSteps } = useLensedData();
  const { saved: savedLenses, activeId: activeLensId, activate: activateLens } = useLens();

  // ⌘1 is Everything, ⌘2 to ⌘9 the first eight saved lenses (lib/lens.ts).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const target = lensForDigit(n, savedLenses);
      if (target === undefined) return;
      e.preventDefault();
      activateLens(target);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [savedLenses, activateLens]);
  const toast = useToast();
  const toggleCompletion = useToggleStepCompletion();
  const toggleFailed = useToggleStepFailed();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  /** Runs a mutation and reports failure the same way every caller does. */
  const run = useCallback(
    async (action: string, fn: () => Promise<unknown>, message: string) => {
      try {
        await fn();
        toast.success(message);
      } catch (error) {
        reportError("mutation", error, { action });
        toast.error("Something went wrong");
      }
    },
    [toast]
  );

  // Open a step's card from the command bar. It is revealed where it is
  // shown on this page; if this page does not show it, go to Steps.
  const openStepCard = useCallback(
    (step: Step) => {
      openStep(step._id, { reveal: true });
      requestAnimationFrame(() => {
        if (!document.querySelector(`[data-step-id="${CSS.escape(step._id)}"]`)) navigate("/steps");
      });
    },
    [navigate]
  );

  const buildStepActions = useCallback(
    (step: Step): StepAction[] => {
      const timerRunning = step.timerStartedAt != null;
      return [
        {
          id: "complete",
          label: step.completed ? "Mark not done" : "Complete",
          icon: Check,
          run: () =>
            run(
              "toggleStep",
              () => toggleCompletion({ id: step._id }),
              step.completed ? "Step reopened" : "Step completed"
            ),
        },
        {
          id: "priority",
          label: step.prioritizedToday ? "Remove from today" : "Prioritize for today",
          icon: Star,
          run: () =>
            run(
              "togglePriority",
              () => updateStep({ id: step._id, prioritizedToday: !step.prioritizedToday }),
              step.prioritizedToday ? "Removed from today" : "Prioritized for today"
            ),
        },
        // One entry per target rather than a nested date picker: the palette
        // filters on label, so typing "postpone" surfaces all of them and
        // typing "postpone tom" goes straight to one.
        ...(step.completed
          ? []
          : POSTPONE_TARGETS.map(({ token, label }) => ({
              id: `postpone-${token}`,
              label: `Postpone to ${label.toLowerCase()}`,
              icon: CalendarClock,
              run: () => {
                const dueDate = resolvePostponeDate(token);
                if (dueDate === undefined) return;
                run(
                  "postponeStep",
                  () => updateStep({ id: step._id, dueDate }),
                  `Postponed to ${label.toLowerCase()}`
                );
              },
            }))),
        {
          id: "timer",
          label: timerRunning ? "Stop timer" : "Start timer",
          icon: Play,
          run: () =>
            run(
              "toggleTimer",
              () => (timerRunning ? stopTimer({ id: step._id }) : startTimer({ id: step._id })),
              timerRunning ? "Timer stopped" : "Timer started"
            ),
        },
        {
          id: "edit",
          label: "Edit step",
          icon: Pencil,
          run: () => setPaletteStep({ step, view: "details" }),
        },
        {
          id: "activity",
          label: "Time & activity",
          icon: History,
          run: () => setPaletteStep({ step, view: "activity" }),
        },
        {
          id: "failed",
          label: step.failed ? "Unmark failed" : "Mark failed",
          icon: XCircle,
          confirm: !step.failed,
          run: () =>
            run(
              "toggleFailed",
              () => toggleFailed({ id: step._id }),
              step.failed ? "Unmarked" : "Marked failed"
            ),
        },
        {
          id: "delete",
          label: "Delete step",
          icon: Trash2,
          confirm: true,
          run: () => run("deleteStep", () => deleteStep({ id: step._id }), "Step deleted"),
        },
      ];
    },
    [run, toggleCompletion, updateStep, startTimer, stopTimer, toggleFailed, deleteStep]
  );

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  // Remember how each panel was closed (see getPanelClosedBy).
  const [sidebarClosedBy, setSidebarClosedBy] = useState(() => getPanelClosedBy("sidebar"));
  const [shortcutsClosedBy, setShortcutsClosedBy] = useState(() => getPanelClosedBy("shortcuts"));
  const toggleSidebarFrom = (source: PanelCloseSource) => {
    setPanelClosedBy("sidebar", source);
    setSidebarClosedBy(source);
    toggleCollapse();
  };

  useUndoShortcuts();
  // Layout remounts on every route, so the panel's open state lives in prefs.
  const [shortcutsOpen, setShortcutsOpenState] = useState(getShortcutsPanelOpen);
  const toggleShortcuts = (source: PanelCloseSource = "keyboard") => {
    setPanelClosedBy("shortcuts", source);
    setShortcutsClosedBy(source);
    setShortcutsOpenState((open) => {
      setShortcutsPanelOpen(!open);
      return !open;
    });
  };
  const { undo: runUndo, redo: runRedo } = useUndoActions();

  useKeyboardShortcuts({
    onToggleSidebar: () => toggleSidebarFrom("keyboard"),
    onToggleShortcuts: () => toggleShortcuts("keyboard"),
    onOpenCommandBar: () => setIsCommandBarOpen((o) => !o),
    onQuickAdd: () => setIsQuickCreateOpen(true),
    onQuickAddRoutine: () => setIsQuickCreateRoutineOpen(true),
    onQuickAddPath: () => setIsQuickCreatePathOpen(true),
    onQuickAddReminder: () => setIsQuickCreateReminderOpen(true),
    onEscape: () => {
      if (isQuickCreateOpen) setIsQuickCreateOpen(false);
      else if (isQuickCreateRoutineOpen) setIsQuickCreateRoutineOpen(false);
      else if (isQuickCreatePathOpen) setIsQuickCreatePathOpen(false);
      else if (isQuickCreateReminderOpen) setIsQuickCreateReminderOpen(false);
      else if (isCommandBarOpen) setIsCommandBarOpen(false);
    },
  });

  return (
    <div className="flex min-h-screen bg-background w-full">
      {/* Mobile Menu Button, bottom-right for one-handed (thumb) reach */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-elev-3 h-11 w-11"
          aria-label="Open menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Command bar (⌘K), navigation + quick actions */}
      <CommandBar
        open={isCommandBarOpen}
        onOpenChange={setIsCommandBarOpen}
        steps={activeSteps || []}
        buildStepActions={buildStepActions}
        onOpenStep={openStepCard}
        actions={[
          { label: "New step", keybindKey: "quickCreate", run: () => setIsQuickCreateOpen(true) },
          {
            label: "New routine",
            keybindKey: "quickCreateRoutine",
            run: () => setIsQuickCreateRoutineOpen(true),
          },
          {
            label: "New path",
            keybindKey: "quickCreatePath",
            run: () => setIsQuickCreatePathOpen(true),
          },
          {
            label: "New reminder",
            keybindKey: "quickCreateReminder",
            run: () => setIsQuickCreateReminderOpen(true),
          },
          {
            label: "Toggle sidebar",
            keybindKey: "toggleSidebar",
            run: () => toggleSidebarFrom("keyboard"),
          },
          {
            label: "Toggle shortcuts panel",
            keybindKey: "toggleShortcuts",
            run: () => toggleShortcuts("keyboard"),
          },
          ...savedLenses.map((s, i) => ({
            label: `Lens: ${s.name}`,
            shortcut: lensDigit(i) ? `meta+${lensDigit(i)}` : undefined,
            icon: Filter,
            run: () => activateLens(s.id),
          })),
          ...(activeLensId
            ? [
                {
                  label: "Lens: Everything",
                  shortcut: `meta+${EVERYTHING_DIGIT}`,
                  icon: FilterX,
                  run: () => activateLens(null),
                },
              ]
            : []),
          { label: "Manage lenses", icon: Filter, run: () => navigate("/lenses") },
          { label: "Undo", shortcut: "meta+z", icon: Undo2, run: () => void runUndo() },
          { label: "Redo", shortcut: "shift+meta+z", icon: Redo2, run: () => void runRedo() },
        ]}
      />

      {/* Global running-timer bar (central, persists across pages) */}
      <GlobalTimerBar />

      {/* Forgotten-timer reconcile: prompts on a session left running for 8h+ */}
      <TimerReconcileGuard />

      {/* New-release prompt. Renders nothing unless an update is waiting. */}
      <UpdateBanner />

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => toggleSidebarFrom("mouse")}
        railWhenClosed={keepRail || sidebarClosedBy === "mouse"}
        onOpenCommandBar={() => setIsCommandBarOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={
              width === "full"
                ? "w-full h-screen"
                : `mx-auto w-full ${PAGE_WIDTH_CLASS[width]} px-3 md:px-8 py-6 pb-24 md:py-6 ${reserveTimerBar ? "md:pt-16" : ""}`
            }
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence initial={false}>
        {shortcutsOpen && (
          <ShortcutsPanel key="shortcuts" onClose={() => toggleShortcuts("mouse")} />
        )}
      </AnimatePresence>

      {/* Shortcuts closed with a click: a quiet handle in the corner brings it
          back. (The sidebar leaves its icon rail instead.) */}
      {!shortcutsOpen && shortcutsClosedBy === "mouse" && (
        <ReopenHandle
          side="right"
          label="Open shortcuts"
          onClick={() => toggleShortcuts("mouse")}
        />
      )}

      {/* Quick Create Dialogs */}
      <QuickCapture open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen} />
      <QuickCapture
        kind="routine"
        open={isQuickCreateRoutineOpen}
        onOpenChange={setIsQuickCreateRoutineOpen}
      />
      <QuickCapture
        kind="path"
        open={isQuickCreatePathOpen}
        onOpenChange={setIsQuickCreatePathOpen}
      />
      <QuickCapture
        kind="reminder"
        open={isQuickCreateReminderOpen}
        onOpenChange={setIsQuickCreateReminderOpen}
      />

      {/* Detail and time dialogs for a step reached through the command bar. */}
      {paletteStep && paletteStep.view !== "time" && (
        <StepDialog
          step={paletteStep.step}
          paths={activePaths || []}
          open
          initialTab={paletteStep.view}
          onOpenChange={(open) => {
            if (!open) setPaletteStep(null);
          }}
          onSaveEdit={(id, updates) =>
            run(
              "updateStep",
              () => updateStep({ id, ...updates } as Parameters<typeof updateStep>[0]),
              "Step updated"
            )
          }
        />
      )}
    </div>
  );
}
