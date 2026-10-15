import { EVERYTHING_DIGIT, lensDigit } from "@/lib/lens";
import { motion } from "framer-motion";
import {
  Settings,
  Calendar,
  ListTodo,
  Target,
  Zap,
  Bell,
  BarChart3,
  X,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Lock,
  Filter,
  Layers,
  Pencil,
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { getKeybinds, formatKeybindDisplay, type KeybindMap } from "@/lib/keybind-config";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import { Popover } from "radix-ui";
import { useData } from "@/contexts/DataContext";
import { useLens } from "@/contexts/LensContext";
import { getStartOfDay, projectReminderOccurrences } from "@/lib/calendar-utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandBar: () => void;
  /** Leave the icon rail when collapsed instead of hiding fully (md+). */
  railWhenClosed?: boolean;
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
          className={`relative z-10 hidden sm:inline-flex h-5 items-center rounded px-1.5 type-kbd ${
            active
              ? "bg-primary-foreground/10 text-primary-foreground"
              : "bg-field text-muted-foreground"
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
  railWhenClosed = false,
}: SidebarProps) {
  const navigate = useNavigate();
  // Closed on md+: an icon rail when closed with a click (or when the rail is
  // kept in Settings), fully hidden when closed from the keyboard.
  const hidden = isCollapsed && !railWhenClosed;
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
          on md+ it's a floating panel, inset from the window with rounded
          corners. Closing slides it away completely, or down to an icon rail
          when that is turned on in Settings. */}
      <div
        className={`
          fixed md:static
          ${hidden ? "w-64 md:w-0 md:ml-0 md:opacity-0 md:invisible md:shadow-none" : isCollapsed ? "w-64 md:w-16 md:ml-3 md:shadow-elev-2" : "w-64 md:ml-3 md:shadow-elev-2"}
          h-screen bg-surface-1 flex flex-col overflow-hidden shadow-elev-3
          md:bg-surface-2 md:shrink-0 md:my-3 md:h-[calc(100vh-1.5rem)] md:rounded-2xl
          z-50
          transition-all duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ opacity: 1 }}
      >
        {/* Header */}
        <div className={`shrink-0 ${isCollapsed ? "p-3" : "p-6"}`}>
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light type-section">
                <span className="text-primary">V</span>
                <span className="text-accent-ink">S</span>
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h2 className="type-page">Today</h2>
                </div>
                {/* Close button for mobile */}
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="type-meta text-muted-foreground">
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
                : "w-full flex items-center gap-2 rounded-lg bg-field px-3 py-2 type-label text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            }
          >
            <Search className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded bg-field px-1.5 type-kbd">
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
          <LensSwitcher isCollapsed={isCollapsed} onNavigate={handleNavigate} />
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
        <div className={`shrink-0 ${isCollapsed ? "p-2" : "p-4"} space-y-1`}>
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

/**
 * The lens switcher: one sidebar row showing the lens the app is in, opening a
 * searchable list (any number of lenses, like the path picker). Editing lives
 * on the Lenses page.
 */
function LensSwitcher({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}) {
  const { saved, activeId, activate } = useLens();
  const active = saved.find((s) => s.id === activeId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const options = [
    {
      id: null as string | null,
      name: "Everything",
      shortcut: `⌘${EVERYTHING_DIGIT}` as string | undefined,
    },
    ...saved.map((s, i) => ({
      id: s.id as string | null,
      name: s.name,
      shortcut: lensDigit(i) ? `⌘${lensDigit(i)}` : undefined,
    })),
  ].filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

  const choose = (id: string | null) => {
    activate(id);
    setOpen(false);
  };
  const go = (path: string) => {
    setOpen(false);
    onNavigate(path);
  };

  const label = active ? active.name : "Everything";
  const triggerClass = `relative flex w-full items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3 text-left"
  } ${
    active
      ? "bg-accent-light text-accent-ink"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setIndex(0);
        }
      }}
    >
      <Popover.Trigger
        className={triggerClass}
        title={`Lens: ${label}`}
        aria-label={`Lens: ${label}`}
      >
        {active ? <Filter className="h-5 w-5 shrink-0" /> : <Layers className="h-5 w-5 shrink-0" />}
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={isCollapsed ? "right" : "bottom"}
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-lg bg-popover p-1 shadow-elev-3 animate-in fade-in-0 zoom-in-95"
        >
          <input
            autoFocus
            value={query}
            placeholder="Find a lens"
            aria-label="Find a lens"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, options.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && options[index]) {
                e.preventDefault();
                choose(options[index].id);
              }
            }}
            className="type-body mb-1 h-9 w-full rounded-md bg-field px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ul role="listbox" aria-label="Lenses" className="max-h-64 overflow-y-auto">
            {options.map((o, i) => (
              <li key={o.id ?? "everything"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === (active?.id ?? null)}
                  ref={i === index ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => choose(o.id)}
                  className={`type-body flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                    i === index ? "bg-muted" : ""
                  }`}
                >
                  {o.id ? (
                    <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  {o.id === (active?.id ?? null) && (
                    <Check className="h-4 w-4 shrink-0 text-accent-ink" />
                  )}
                  {o.shortcut && (
                    <kbd className="type-kbd rounded bg-field px-1.5 text-muted-foreground">
                      {o.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="type-meta px-2 py-1.5 text-muted-foreground">No lens matches</li>
            )}
          </ul>
          <div className="mt-1 flex gap-1 pt-1">
            <button
              type="button"
              onClick={() => go("/lenses?new")}
              className="type-label flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              New lens
            </button>
            <button
              type="button"
              onClick={() => go(active ? `/lenses?edit=${active.id}` : "/lenses")}
              className="type-label flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
              Manage
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
