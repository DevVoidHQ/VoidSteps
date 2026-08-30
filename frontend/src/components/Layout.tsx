import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import QuickCapture from "./QuickCapture";
import GlobalTimerBar from "./GlobalTimerBar";
import TimerReconcileGuard from "./TimerReconcileGuard";
import CommandBar from "./CommandBar";
import { Button } from "@/components/ui/Button";
import { Check, Clock, History, Menu, Pencil, Play, Star, Trash2, XCircle } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { StepDialog, type StepDialogTab } from "./StepDialog";
import { TimeEditDialog } from "./TimeEditDialog";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import {
  useDeleteStep,
  useSetTotalTime,
  useStartTimer,
  useStopTimer,
  useToggleStepCompletion,
  useToggleStepFailed,
  useUpdateStep,
} from "@/lib/local-mutations";
import type { Step } from "@/types/index";
import type { StepAction } from "./CommandBar";

const SIDEBAR_COLLAPSED_KEY = "voidsteps-sidebar-collapsed";

function getInitialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

export default function Layout({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isQuickCreateRoutineOpen, setIsQuickCreateRoutineOpen] = useState(false);
  const [isQuickCreatePathOpen, setIsQuickCreatePathOpen] = useState(false);
  const [isQuickCreateReminderOpen, setIsQuickCreateReminderOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  // A step reached through the command bar, and which of its dialogs is open.
  const [paletteStep, setPaletteStep] = useState<{ step: Step; view: StepDialogTab | "time" } | null>(null);

  const { activeSteps, activePaths } = useData();
  const toast = useToast();
  const toggleCompletion = useToggleStepCompletion();
  const toggleFailed = useToggleStepFailed();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const setTotalTime = useSetTotalTime();

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

  const buildStepActions = useCallback(
    (step: Step): StepAction[] => {
      const timerRunning = step.timerStartedAt != null;
      return [
        {
          id: "complete",
          label: step.completed ? "Mark not done" : "Complete",
          icon: Check,
          run: () => run("toggleStep", () => toggleCompletion({ id: step._id }), step.completed ? "Step reopened" : "Step completed"),
        },
        {
          id: "priority",
          label: step.prioritizedToday ? "Remove from today" : "Prioritize for today",
          icon: Star,
          run: () =>
            run("togglePriority", () => updateStep({ id: step._id, prioritizedToday: !step.prioritizedToday }),
              step.prioritizedToday ? "Removed from today" : "Prioritized for today"),
        },
        {
          id: "timer",
          label: timerRunning ? "Stop timer" : "Start timer",
          icon: Play,
          run: () =>
            run("toggleTimer", () => (timerRunning ? stopTimer({ id: step._id }) : startTimer({ id: step._id })),
              timerRunning ? "Timer stopped" : "Timer started"),
        },
        { id: "time", label: "Edit time tracked", icon: Clock, run: () => setPaletteStep({ step, view: "time" }) },
        { id: "edit", label: "Edit step", icon: Pencil, run: () => setPaletteStep({ step, view: "details" }) },
        { id: "activity", label: "Activity", icon: History, run: () => setPaletteStep({ step, view: "activity" }) },
        {
          id: "failed",
          label: step.failed ? "Unmark failed" : "Mark failed",
          icon: XCircle,
          confirm: !step.failed,
          run: () => run("toggleFailed", () => toggleFailed({ id: step._id }), step.failed ? "Unmarked" : "Marked failed"),
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

  useKeyboardShortcuts({
    onToggleSidebar: toggleCollapse,
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
          className="rounded-full shadow-lg h-11 w-11"
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
        actions={[
          { label: "New step", keybindKey: "quickCreate", run: () => setIsQuickCreateOpen(true) },
          { label: "New routine", keybindKey: "quickCreateRoutine", run: () => setIsQuickCreateRoutineOpen(true) },
          { label: "New path", keybindKey: "quickCreatePath", run: () => setIsQuickCreatePathOpen(true) },
          { label: "New reminder", keybindKey: "quickCreateReminder", run: () => setIsQuickCreateReminderOpen(true) },
          { label: "Toggle sidebar", keybindKey: "toggleSidebar", run: toggleCollapse },
        ]}
      />

      {/* Global running-timer bar (central, persists across pages) */}
      <GlobalTimerBar />

      {/* Forgotten-timer reconcile + cross-device single-timer convergence */}
      <TimerReconcileGuard />

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
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
              fullWidth
                ? "w-full h-screen"
                : "container mx-auto px-3 md:px-8 py-6 pb-24 md:py-6"
            }
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>


      {/* Quick Create Dialogs */}
      <QuickCapture open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen} />
      <QuickCapture kind="routine" open={isQuickCreateRoutineOpen} onOpenChange={setIsQuickCreateRoutineOpen} />
      <QuickCapture kind="path" open={isQuickCreatePathOpen} onOpenChange={setIsQuickCreatePathOpen} />
      <QuickCapture kind="reminder" open={isQuickCreateReminderOpen} onOpenChange={setIsQuickCreateReminderOpen} />

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
            run("updateStep", () => updateStep({ id, ...updates } as Parameters<typeof updateStep>[0]), "Step updated")
          }
        />
      )}

      {paletteStep && paletteStep.view === "time" && (
        <TimeEditDialog
          open
          onOpenChange={(open) => {
            if (!open) setPaletteStep(null);
          }}
          currentTimeMs={paletteStep.step.totalTimeSpentMs || 0}
          isTimerRunning={paletteStep.step.timerStartedAt != null}
          onApply={(totalMs) =>
            run("setTotalTime", () => setTotalTime({ id: paletteStep.step._id, totalTimeSpentMs: totalMs }), "Time updated")
          }
        />
      )}
    </div>
  );
}
