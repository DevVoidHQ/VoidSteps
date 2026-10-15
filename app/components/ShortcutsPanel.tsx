import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CornerDownLeft,
  Hash,
  Keyboard,
  Layers,
  PanelLeft,
  Plus,
  Search,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { formatKeybindDisplay, getKeybinds, type KeybindMap } from "@/lib/keybind-config";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 shrink-0 items-center rounded bg-field px-1.5 type-kbd text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Row({ label, keys }: { label: string; keys: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1 type-body">
      <span className="min-w-0 text-foreground">{label}</span>
      <span className="flex shrink-0 items-center gap-1">{keys}</span>
    </li>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 type-overline text-muted-foreground">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}

/**
 * Keyboard reference docked on the right, the mirror of the left sidebar:
 * the everyday keys only. Rebindable keys are read live from Settings; the
 * full reference is KeyReference, shown in Settings, Keybinds.
 */
/** One shortcut, styled like a sidebar row so the two panels match. */
function PanelRow({
  icon: Icon,
  label,
  keys,
}: {
  icon: LucideIcon;
  label: string;
  keys: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground">
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {keys}
    </li>
  );
}

export default function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const kb = getKeybinds();
  const show = (key: keyof KeybindMap) => <Kbd>{formatKeybindDisplay(kb[key])}</Kbd>;
  const fixed = (combo: string) => <Kbd>{formatKeybindDisplay(combo)}</Kbd>;

  return (
    // The outer box animates its width so the page re-centres as the panel
    // slides; the panel inside keeps its width so nothing reflows mid-slide.
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "auto", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="hidden shrink-0 overflow-hidden md:block"
    >
      {/* Same frame, header, rows and footer as the left sidebar. */}
      <aside
        aria-label="Keyboard shortcuts"
        className="my-3 mr-3 flex h-[calc(100vh-1.5rem)] w-64 flex-col overflow-hidden rounded-2xl bg-surface-2 shadow-elev-2"
      >
        <div className="shrink-0 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="type-page">Shortcuts</h2>
            <button
              type="button"
              aria-label="Close shortcuts"
              title={`Close (${formatKeybindDisplay(kb.toggleShortcuts)})`}
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="type-meta text-muted-foreground">The everyday keys</p>
        </div>

        {/* Only the everyday keys. The full list, including rebinding, lives
            in Settings, Keybinds. */}
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4 scrollbar-hide">
          <PanelRow icon={Search} label="Command bar" keys={show("openCommandBar")} />
          <PanelRow icon={Plus} label="New step" keys={show("quickCreate")} />
          <PanelRow icon={Undo2} label="Undo" keys={fixed("meta+z")} />
          <PanelRow icon={X} label="Close or cancel" keys={<Kbd>Esc</Kbd>} />
          <PanelRow icon={Layers} label="Switch lens" keys={<Kbd>⌘1-9</Kbd>} />
          <PanelRow icon={CornerDownLeft} label="Open a step" keys={<Kbd>Enter</Kbd>} />
          <PanelRow icon={Hash} label="Step actions" keys={<Kbd>1-9</Kbd>} />
          <PanelRow icon={CalendarClock} label="Postpone by…" keys={<Kbd>⌥ click</Kbd>} />
          <PanelRow icon={PanelLeft} label="Sidebar" keys={show("toggleSidebar")} />
          <PanelRow icon={Keyboard} label="This panel" keys={show("toggleShortcuts")} />
        </ul>

        <div className="shrink-0 p-4">
          <Link
            to="/settings?tab=keybinds"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowRight className="h-5 w-5 shrink-0" />
            <span className="flex-1">All shortcuts</span>
          </Link>
        </div>
      </aside>
    </motion.div>
  );
}
