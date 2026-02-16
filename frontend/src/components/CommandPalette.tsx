import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useData } from "@/contexts/DataContext";
import {
  Calendar,
  ListTodo,
  Target,
  Zap,
  BarChart3,
  Network,
  Settings,
  Search,
  ArrowRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  name: string;
  icon: React.ElementType;
  shortcut?: string;
  category: "page" | "step" | "path";
  action: () => void;
  subtitle?: string;
}

const PAGES = [
  { name: "Today", path: "/", icon: Calendar, shortcut: "1" },
  { name: "Steps", path: "/steps", icon: ListTodo, shortcut: "2" },
  { name: "Paths", path: "/paths", icon: Target, shortcut: "3" },
  { name: "Routines", path: "/routines", icon: Zap, shortcut: "4" },
  { name: "Analytics", path: "/analytics", icon: BarChart3, shortcut: "5" },
  { name: "Pathway", path: "/pathway", icon: Network, shortcut: "6" },
  { name: "Settings", path: "/settings", icon: Settings, shortcut: "7" },
];

export default function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { activeSteps, paths } = useData();

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after dialog renders
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Build command items list — steps first, then paths, then pages (only when query matches)
  const items = useMemo<CommandItem[]>(() => {
    const lowerQuery = query.toLowerCase().trim();

    // Steps — always searched when there's a query
    const stepItems: CommandItem[] = (activeSteps ?? [])
      .filter(
        (step) =>
          lowerQuery && step.title.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10)
      .map((step) => ({
        id: `step-${step._id}`,
        name: step.title,
        icon: step.completed ? CheckCircle2 : step.prioritizedToday ? Star : ListTodo,
        category: "step" as const,
        subtitle: step.path?.title ?? undefined,
        action: () => {
          navigate("/steps");
          close();
        },
      }));

    // Paths — searched when there's a query
    const pathItems: CommandItem[] = (paths ?? [])
      .filter(
        (path) =>
          lowerQuery && path.title.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .map((path) => ({
        id: `path-${path._id}`,
        name: path.title,
        icon: Target,
        category: "path" as const,
        action: () => {
          navigate("/paths");
          close();
        },
      }));

    // Pages — only shown when query matches a page name, or when no query (as quick nav)
    const pageItems: CommandItem[] = PAGES.filter(
      (page) =>
        !lowerQuery || page.name.toLowerCase().includes(lowerQuery)
    ).map((page) => ({
      id: `page-${page.path}`,
      name: page.name,
      icon: page.icon,
      shortcut: page.shortcut,
      category: "page" as const,
      action: () => {
        navigate(page.path);
        close();
      },
    }));

    // When no query, show pages as quick nav. When searching, steps first.
    if (!lowerQuery) {
      return pageItems;
    }
    return [...stepItems, ...pathItems, ...pageItems];
  }, [query, activeSteps, paths, navigate, close]);

  // Clamp selectedIndex when items change
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Number keys 1-7: quick page navigation (only when search is empty)
      if (!query.trim()) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 7) {
          const page = PAGES[num - 1];
          if (page) {
            e.preventDefault();
            navigate(page.path);
            close();
            return;
          }
        }
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) {
            items[selectedIndex].action();
          }
          break;
      }
    },
    [query, items, selectedIndex, navigate, close]
  );

  // Category labels
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case "page":
        return "Pages";
      case "step":
        return "Steps";
      case "path":
        return "Paths";
      default:
        return "";
    }
  };

  // Group items by category for rendering with headers
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: (CommandItem & { globalIndex: number })[] }[] = [];
    let currentCategory = "";
    let globalIndex = 0;

    for (const item of items) {
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        groups.push({ category: currentCategory, items: [] });
      }
      groups[groups.length - 1].items.push({ ...item, globalIndex });
      globalIndex++;
    }

    return groups;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="rounded-lg"
            >
              {/* Search Input */}
              <div className="border-b border-border p-3">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search steps, paths..."
                  leftIcon={<Search className="w-4 h-4" />}
                  className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Results List */}
              <div
                ref={listRef}
                className="max-h-96 overflow-y-auto py-2"
              >
                {items.length === 0 && query.trim() !== "" && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results found for "{query}"
                  </div>
                )}

                {groupedItems.map((group) => (
                  <div key={group.category}>
                    <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {getCategoryLabel(group.category)}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isSelected = item.globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={item.globalIndex}
                          onClick={item.action}
                          onMouseEnter={() =>
                            setSelectedIndex(item.globalIndex)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 text-left min-w-0">
                            <span className="truncate block">{item.name}</span>
                            {item.subtitle && (
                              <span className="text-xs text-muted-foreground truncate block">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    1-7
                  </kbd>
                  go to page
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    &uarr;&darr;
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    &crarr;
                  </kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    esc
                  </kbd>
                  close
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
