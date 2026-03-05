import { useClerk, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { LogOut, Settings, Calendar, ListTodo, Target, Zap, BarChart3, Network, X, ChevronsLeft, ChevronsRight, Search, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette: () => void;
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  active?: boolean;
  showActiveIndicator?: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}

function SidebarItem({ icon: Icon, label, isCollapsed, active, showActiveIndicator, iconOnly, onClick, href, className }: SidebarItemProps) {
  const hideLabel = isCollapsed || iconOnly;
  const baseClass = `relative w-full flex items-center ${
    hideLabel ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
  } rounded-lg transition-colors ${
    active
      ? 'text-primary-foreground font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  } ${className ?? ''}`;

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
      {!hideLabel && <span className="relative z-10">{label}</span>}
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
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={baseClass}
    >
      {content}
    </button>
  );
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, onOpenCommandPalette }: SidebarProps) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Today', icon: Calendar },
    { path: '/steps', label: 'Steps', icon: ListTodo },
    { path: '/paths', label: 'Paths', icon: Target },
    { path: '/routines', label: 'Routines', icon: Zap },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/pathway', label: 'Pathway', icon: Network },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static
          ${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-card border-r border-border flex flex-col
          z-50
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ opacity: 1, backgroundColor: 'hsl(var(--card))' }}
      >
        {/* Header */}
        <div className={`border-b border-border ${isCollapsed ? 'p-3' : 'p-6'}`}>
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <span className="text-lg font-bold">V</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Welcome, {user?.firstName || 'User'}</p>
                  <h2 className="text-2xl font-bold mt-1">Today</h2>
                </div>
                {/* Close button for mobile */}
                <button
                  onClick={onClose}
                  className="md:hidden p-2 hover:bg-muted rounded-lg"
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

        {/* Search / Command Palette Trigger */}
        <div className={`${isCollapsed ? 'px-2 py-2' : 'px-4 py-2'}`}>
          <button
            onClick={onOpenCommandPalette}
            title={isCollapsed ? 'Search (⌘K)' : undefined}
            className={`w-full flex items-center gap-2 rounded-lg border border-input bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-sm">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed}
              active={isActive(item.path)}
              showActiveIndicator
              onClick={() => handleNavigate(item.path)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-border ${isCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
            <SidebarItem
              icon={MessageSquare}
              label="Feedback"
              isCollapsed={isCollapsed}
              href="mailto:aneeshbhat@devvoid.org?subject=VoidSteps%20Feedback&body=Hey%2C%0A%0AI%20wanted%20to%20share%20some%20feedback%20about%20VoidSteps%3A%0A%0A"
              className={isCollapsed ? '' : 'flex-1'}
            />
            <SidebarItem
              icon={isCollapsed ? ChevronsRight : ChevronsLeft}
              label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              isCollapsed={isCollapsed}
              iconOnly
              onClick={onToggleCollapse}
              className={`hidden md:flex ${isCollapsed ? '' : 'shrink-0 !w-auto'}`}
            />
          </div>
          <SidebarItem
            icon={LogOut}
            label="Logout"
            isCollapsed={isCollapsed}
            onClick={() => signOut({ redirectUrl: '/' })}
          />
        </div>
      </div>
    </>
  );
}
