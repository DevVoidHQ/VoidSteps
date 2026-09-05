import { motion } from "framer-motion";
import {
  Settings,
  Calendar,
  ListTodo,
  Target,
  Zap,
  Bell,
  BookOpen,
  BarChart3,
  X,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Lock,
} from "lucide-react";
import { getKeybinds, formatKeybindDisplay, type KeybindMap } from "@/lib/keybind-config";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { getStartOfDay, projectReminderOccurrences } from "@/lib/calendar-utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandBar: () => void;
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  active?: boolean;
  showActiveIndicator?: boolean;
  iconOnly?: boolean;
  shortcut?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  dot?: boolean;
  locked?: boolean;
}

function SidebarItem({
  icon: Icon,
  label,
  isCollapsed,
  active,
  showActiveIndicator,
  iconOnly,
  shortcut,
  onClick,
  href,
  className,
  dot,
  locked,
}: SidebarItemProps) {
  const hideLabel = isCollapsed || iconOnly;
  const baseClass = `relative w-full flex items-center ${
    hideLabel ? "justify-center px-2 py-3" : "gap-3 px-4 py-3 text-left"
  } rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    active
      ? "text-primary-foreground font-medium"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  } ${className ?? ""}`;

  const content = (
    <>
      {showActiveIndicator && active && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 bg-primary rounded-lg"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <Icon className="relative z-10 w-5 h-5 shrink-0" />
      {/* Collapsed: dot on the icon corner. Expanded: dot is rendered inline after the label. */}
      {dot && hideLabel && (
        <span
          className="absolute top-1.5 right-1.5 z-10 h-2 w-2 rounded-full bg-warning ring-2 ring-card"
          title="Reminder today"
        />
      )}
      {!hideLabel && <span className="relative z-10 flex-1">{label}</span>}
      {!hideLabel && dot && (
        <span
          className="relative z-10 h-2 w-2 rounded-full bg-warning shrink-0"
          title="Reminder today"
        />
      )}
      {locked && hideLabel && (
        <span
          className="absolute top-1.5 right-1.5 z-10 rounded-full bg-card p-0.5"
          title="Pro feature"
        >
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </span>
      )}
      {!hideLabel && locked && (
        <Lock
          className="relative z-10 h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-label="Pro feature"
        />
      )}
      {!hideLabel && !locked && shortcut && (
        <kbd
          className={`relative z-10 hidden sm:inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] ${
            active
              ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {shortcut}
        </kbd>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={hideLabel ? label : undefined}
        className={baseClass}
      >
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} title={isCollapsed ? label : undefined} className={baseClass}>
      {content}
    </button>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  onOpenCommandBar,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { reminders } = useData();

  const hasTodayReminder = useMemo(() => {
    if (!reminders) return false;
    const start = getStartOfDay(new Date());
    const end = start + 86400000 - 1;
    return reminders.some((r) => projectReminderOccurrences(r, start, end).length > 0);
  }, [reminders]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const keybinds = getKeybinds();

  const navItems: {
    path: string;
    label: string;
    icon: LucideIcon;
    keybindKey?: keyof KeybindMap;
  }[] = [
    { path: "/", label: "Today", icon: Calendar, keybindKey: "navToday" },
    { path: "/steps", label: "Steps", icon: ListTodo, keybindKey: "navSteps" },
    { path: "/paths", label: "Paths", icon: Target, keybindKey: "navPaths" },
    { path: "/routines", label: "Routines", icon: Zap, keybindKey: "navRoutines" },
    { path: "/reminders", label: "Reminders", icon: Bell, keybindKey: "navReminders" },
    { path: "/notes", label: "Notes", icon: BookOpen, keybindKey: "navNotes" },
    { path: "/analytics", label: "Analytics", icon: BarChart3, keybindKey: "navAnalytics" },
    { path: "/settings", label: "Settings", icon: Settings, keybindKey: "navSettings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar. On mobile it's an overlay drawer (always full width + elevated);
          on md+ it's static and can collapse to an icon rail. */}
      <div
        className={`
          fixed md:static
          ${isCollapsed ? "w-64 md:w-16" : "w-64"} h-screen bg-card border-r border-border flex flex-col overflow-hidden
          shadow-2xl md:shadow-none
          z-50
          transition-all duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ opacity: 1 }}
      >
        {/* Header */}
        <div className={`shrink-0 border-b border-border ${isCollapsed ? "p-3" : "p-6"}`}>
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-lg font-bold tracking-tight">
                <span className="text-primary">V</span>
                <span className="text-accent">S</span>
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">Today</h2>
                </div>
                {/* Close button for mobile */}
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </>
          )}
        </div>

        {/* Command bar trigger */}
        <div className={isCollapsed ? "p-2 pb-0" : "px-4 pt-4"}>
          <button
            onClick={onOpenCommandBar}
            title="Search & commands"
            className={
              isCollapsed
                ? "w-full flex items-center justify-center rounded-lg py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                : "w-full flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            }
          >
            <Search className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-card px-1.5 font-mono text-[10px]">
                  {formatKeybindDisplay(keybinds.openCommandBar)}
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 min-h-0 overflow-y-auto scrollbar-hide ${isCollapsed ? "p-2" : "p-4"} space-y-1`}
        >
          {navItems.map((item) => (
            <div key={item.path}>
              <SidebarItem
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
                active={isActive(item.path)}
                showActiveIndicator
                shortcut={
                  item.keybindKey && keybinds[item.keybindKey]
                    ? formatKeybindDisplay(keybinds[item.keybindKey])
                    : undefined
                }
                dot={item.path === "/reminders" && hasTodayReminder}
                onClick={() => handleNavigate(item.path)}
              />
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`shrink-0 border-t border-border ${isCollapsed ? "p-2" : "p-4"} space-y-1`}>
          <SidebarItem
            icon={isCollapsed ? ChevronsRight : ChevronsLeft}
            label={isCollapsed ? "Expand" : "Collapse"}
            isCollapsed={isCollapsed}
            shortcut={!isCollapsed ? formatKeybindDisplay(keybinds.toggleSidebar) : undefined}
            onClick={onToggleCollapse}
            className="hidden md:flex"
          />
        </div>
      </div>
    </>
  );
}
