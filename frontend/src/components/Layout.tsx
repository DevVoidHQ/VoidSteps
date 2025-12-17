import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
