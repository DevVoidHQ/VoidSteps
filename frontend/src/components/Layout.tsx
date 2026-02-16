import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { isOnline, pendingSyncCount } = useOffline();

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

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((prev) => !prev);
  }, []);

  useKeyboardShortcuts({
    onTogglePalette: togglePalette,
    onToggleSidebar: toggleCollapse,
    onQuickAdd: () => {
      // Placeholder for quick add - will be implemented in a future phase
    },
    onEscape: () => {
      if (isPaletteOpen) {
        setIsPaletteOpen(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen bg-background w-full">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Offline / Sync Indicator */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-muted border border-border shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-yellow-500' : 'bg-destructive'}`}
          />
          {isOnline
            ? `Syncing ${pendingSyncCount} change${pendingSyncCount !== 1 ? 's' : ''}...`
            : 'Offline'}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
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
            className="container mx-auto px-4 md:px-8 py-6 pt-16 md:pt-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Command Palette */}
      <CommandPalette open={isPaletteOpen} onOpenChange={setIsPaletteOpen} />
    </div>
  );
}
