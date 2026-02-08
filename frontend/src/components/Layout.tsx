import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@devvoid/ui";
import { Menu } from "lucide-react";
import { useOffline } from "@/contexts/OfflineContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isOnline, pendingSyncCount } = useOffline();

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
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto scrollbar-hide">
        <div className="container mx-auto px-4 md:px-8 py-6 pt-16 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
