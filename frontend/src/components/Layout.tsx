import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import QuickCreateDialog from "./QuickCreateDialog";
import QuickCreateRoutineDialog from "./QuickCreateRoutineDialog";
import QuickCreatePathDialog from "./QuickCreatePathDialog";
import QuickCreateReminderDialog from "./QuickCreateReminderDialog";
import GlobalTimerBar from "./GlobalTimerBar";
import TimerReconcileGuard from "./TimerReconcileGuard";
import CommandBar from "./CommandBar";
import { Button } from "@/components/ui/Button";
import { Menu } from "lucide-react";
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
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isQuickCreateRoutineOpen, setIsQuickCreateRoutineOpen] = useState(false);
  const [isQuickCreatePathOpen, setIsQuickCreatePathOpen] = useState(false);
  const [isQuickCreateReminderOpen, setIsQuickCreateReminderOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

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


      {/* Quick Create Dialogs */}
      <QuickCreateDialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen} />
      <QuickCreateRoutineDialog open={isQuickCreateRoutineOpen} onOpenChange={setIsQuickCreateRoutineOpen} />
      <QuickCreatePathDialog open={isQuickCreatePathOpen} onOpenChange={setIsQuickCreatePathOpen} />
      <QuickCreateReminderDialog open={isQuickCreateReminderOpen} onOpenChange={setIsQuickCreateReminderOpen} />
    </div>
  );
}
