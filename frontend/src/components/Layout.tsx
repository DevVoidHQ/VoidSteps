import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import FailedSyncReviewDialog from "./FailedSyncReviewDialog";
import QuickCreateDialog from "./QuickCreateDialog";
import QuickCreateRoutineDialog from "./QuickCreateRoutineDialog";
import QuickCreatePathDialog from "./QuickCreatePathDialog";
import QuickCreateReminderDialog from "./QuickCreateReminderDialog";
import GlobalTimerBar from "./GlobalTimerBar";
import TimerReconcileGuard from "./TimerReconcileGuard";
import CommandBar from "./CommandBar";
import { Button } from "@/components/ui/Button";
import { Menu } from "lucide-react";
import { useOffline } from "@/contexts/OfflineContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
  const [isFailedSyncOpen, setIsFailedSyncOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isQuickCreateRoutineOpen, setIsQuickCreateRoutineOpen] = useState(false);
  const [isQuickCreatePathOpen, setIsQuickCreatePathOpen] = useState(false);
  const [isQuickCreateReminderOpen, setIsQuickCreateReminderOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const { isOnline, pendingSyncCount, failedSyncCount } = useOffline();

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

      {/* Offline / Sync Indicator */}
      {(!isOnline || pendingSyncCount > 0 || failedSyncCount > 0) && (
        <div className="fixed bottom-4 left-4 md:left-auto md:right-4 z-50 flex flex-col gap-1.5">
          {(!isOnline || pendingSyncCount > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-muted border border-border shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-yellow-500' : 'bg-destructive'}`}
              />
              {isOnline
                ? `Syncing ${pendingSyncCount} change${pendingSyncCount !== 1 ? 's' : ''}...`
                : 'Offline'}
            </div>
          )}
          {failedSyncCount > 0 && (
            <button
              onClick={() => setIsFailedSyncOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 border border-destructive/30 shadow-sm text-destructive cursor-pointer hover:bg-destructive/20 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-destructive" />
              {failedSyncCount} change{failedSyncCount !== 1 ? 's' : ''} failed to sync
            </button>
          )}
        </div>
      )}

      {/* Command bar (⌘K), navigation + quick actions */}
      <CommandBar
        open={isCommandBarOpen}
        onOpenChange={setIsCommandBarOpen}
        actions={[
          { label: "New Step", keybindKey: "quickCreate", run: () => setIsQuickCreateOpen(true) },
          { label: "New Routine", keybindKey: "quickCreateRoutine", run: () => setIsQuickCreateRoutineOpen(true) },
          { label: "New Path", keybindKey: "quickCreatePath", run: () => setIsQuickCreatePathOpen(true) },
          { label: "New Reminder", keybindKey: "quickCreateReminder", run: () => setIsQuickCreateReminderOpen(true) },
          { label: "Toggle Sidebar", keybindKey: "toggleSidebar", run: toggleCollapse },
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

      {/* Failed Sync Review */}
      <FailedSyncReviewDialog open={isFailedSyncOpen} onOpenChange={setIsFailedSyncOpen} />

      {/* Quick Create Dialogs */}
      <QuickCreateDialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen} />
      <QuickCreateRoutineDialog open={isQuickCreateRoutineOpen} onOpenChange={setIsQuickCreateRoutineOpen} />
      <QuickCreatePathDialog open={isQuickCreatePathOpen} onOpenChange={setIsQuickCreatePathOpen} />
      <QuickCreateReminderDialog open={isQuickCreateReminderOpen} onOpenChange={setIsQuickCreateReminderOpen} />
    </div>
  );
}
