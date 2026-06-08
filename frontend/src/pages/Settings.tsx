import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { collectDiagnostics } from "@/lib/feedback-diagnostics";
import { formatRelativePast } from "@/lib/date-utils";
import { useTheme, PRESET_THEMES } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/contexts/ThemeContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useToast } from "@/contexts/ToastContext";
import { useUser } from "@clerk/clerk-react";
import { THEME_AI_PROMPT } from "@/lib/theme-ai-prompt";
import { usePlan, useCan, canUseTheme } from "@/lib/use-plan";
import { seedDemoData, isSeedAdmin } from "@/lib/seed-demo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { getDeferDatesMode, setDeferDatesMode, getDueDatesMode, setDueDatesMode, getPrioritizeDefault, setPrioritizeDefault, getOpenFocusOnPlay, setOpenFocusOnPlay, getShowStepDates, setShowStepDates, getStepActions, setStepActionMode, STEP_ACTION_ORDER, STEP_ACTION_LABELS, getStepsClickAction, setStepsClickAction, getTodayClickAction, setTodayClickAction, resetGeneralPreferences, type DeferDatesMode, type StepActionsConfig, type StepClickAction } from "@/lib/preferences";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import DataSettings from "@/components/DataSettings";
import { Copy, Sparkles, Save, RotateCcw, Shuffle, Dices, Check, Trash2, Lock } from "lucide-react";
import { maybeBackup } from "@/lib/backup-engine";
import {
  getKeybinds,
  setKeybind,
  resetKeybind,
  resetAllKeybinds,
  formatKeybindDisplay,
  eventToKeybind,
  KEYBIND_LABELS,
  DEFAULT_KEYBINDS,
  type KeybindMap,
} from "@/lib/keybind-config";

// Every theme is exactly 6 colors. Everything else derives from these.
const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: "Background",
  foreground: "Foreground",
  primary: "Primary",
  accent: "Accent",
  primaryLight: "Primary Light",
  accentLight: "Accent Light",
};

// Helper to convert HSL string to hex for color input
const hslToHex = (hsl: string): string => {
  const parts = hsl.split(' ');
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1]) || 0;
  const l = parseFloat(parts[2]) || 0;

  const hDecimal = h / 360;
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = lDecimal;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
    const p = 2 * lDecimal - q;

    r = hue2rgb(p, q, hDecimal + 1 / 3);
    g = hue2rgb(p, q, hDecimal);
    b = hue2rgb(p, q, hDecimal - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Helper to convert hex to HSL string
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

function GeneralSettings() {
  const [deferMode, setDeferMode] = useState<DeferDatesMode>(getDeferDatesMode());
  const [dueMode, setDueMode] = useState<DeferDatesMode>(getDueDatesMode());
  const [prioritizeDefault, setPrioritizeDefaultState] = useState(getPrioritizeDefault());
  const [openFocusOnPlay, setOpenFocusOnPlayState] = useState(getOpenFocusOnPlay());
  const [showStepDates, setShowStepDatesState] = useState(getShowStepDates());
  const [stepActions, setStepActions] = useState<StepActionsConfig>(getStepActions());
  const [stepsClick, setStepsClick] = useState<StepClickAction>(getStepsClickAction());
  const [todayClick, setTodayClick] = useState<StepClickAction>(getTodayClickAction());
  const modeOptions = [
    { value: "off", label: "Off (not at all)" },
    { value: "edit", label: "Edit only" },
    { value: "both", label: "Create & edit" },
  ];
  const clickOptions = [
    { value: "prioritize", label: "Prioritize / deprioritize" },
    { value: "play", label: "Start / stop timer" },
    { value: "complete", label: "Mark complete" },
    { value: "none", label: "Do nothing" },
  ];
  const handleResetGeneral = () => {
    resetGeneralPreferences();
    setDeferMode(getDeferDatesMode());
    setDueMode(getDueDatesMode());
    setPrioritizeDefaultState(getPrioritizeDefault());
    setOpenFocusOnPlayState(getOpenFocusOnPlay());
    setShowStepDatesState(getShowStepDates());
    setStepActions(getStepActions());
    setStepsClick(getStepsClickAction());
    setTodayClick(getTodayClickAction());
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">General</h2>
            <Button variant="outline" size="sm" onClick={handleResetGeneral}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>

          <Toggle
            size="sm"
            checked={prioritizeDefault}
            onChange={(e) => { setPrioritizeDefaultState(e.target.checked); setPrioritizeDefault(e.target.checked); }}
            label="Prioritize new steps for today by default"
            description="Pre-checks 'Prioritize for today' when creating a step. Off by default."
          />

          <Toggle
            size="sm"
            checked={openFocusOnPlay}
            onChange={(e) => { setOpenFocusOnPlayState(e.target.checked); setOpenFocusOnPlay(e.target.checked); }}
            label="Open focus view when starting a timer"
            description="Starting a step's timer opens the fullscreen focus view. On by default."
          />

          <Toggle
            size="sm"
            checked={showStepDates}
            onChange={(e) => { setShowStepDatesState(e.target.checked); setShowStepDates(e.target.checked); }}
            label="Show created & updated dates on steps"
            description="Adds a small footer to each step with when it was created and last updated. On by default."
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clicking a step on the Steps page</label>
            <p className="text-sm text-muted-foreground">
              What happens when you click a step's title or body on the Steps page.
            </p>
            <Select
              className="max-w-xs"
              value={stepsClick}
              onValueChange={(v) => { const a = v as StepClickAction; setStepsClick(a); setStepsClickAction(a); }}
              options={clickOptions}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clicking a step on Today</label>
            <p className="text-sm text-muted-foreground">
              What happens when you click a step's title or body on the Today page.
            </p>
            <Select
              className="max-w-xs"
              value={todayClick}
              onValueChange={(v) => { const a = v as StepClickAction; setTodayClick(a); setTodayClickAction(a); }}
              options={clickOptions}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Step actions</label>
              <p className="text-sm text-muted-foreground">
                Each action shows as its own inline button when on, or moves into the step's "more" menu when off.
              </p>
            </div>
            {STEP_ACTION_ORDER.map((key) => (
              <Toggle
                key={key}
                size="sm"
                checked={stepActions[key] === "open"}
                onChange={(e) => {
                  const mode = e.target.checked ? "open" : "compact";
                  setStepActions((prev) => ({ ...prev, [key]: mode }));
                  setStepActionMode(key, mode);
                }}
                label={STEP_ACTION_LABELS[key]}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due date</label>
            <p className="text-sm text-muted-foreground">
              A deadline for the step. Choose where it can be set.
            </p>
            <Select
              className="max-w-xs"
              value={dueMode}
              onValueChange={(v) => { const m = v as DeferDatesMode; setDueMode(m); setDueDatesMode(m); }}
              options={modeOptions}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Defer steps to a later date</label>
            <p className="text-sm text-muted-foreground">
              A "Defer until" date hides a step until that day. Choose where it can be set.
            </p>
            <Select
              className="max-w-xs"
              value={deferMode}
              onValueChange={(v) => { const m = v as DeferDatesMode; setDeferMode(m); setDeferDatesMode(m); }}
              options={modeOptions}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeybindSettings() {
  const [keybinds, setKeybindsState] = useState<KeybindMap>(getKeybinds);
  const [editingAction, setEditingAction] = useState<keyof KeybindMap | null>(null);

  const handleStartEdit = (action: keyof KeybindMap) => {
    setEditingAction(action);
  };

  const handleReset = (action: keyof KeybindMap) => {
    resetKeybind(action);
    setKeybindsState(getKeybinds());
  };

  const handleResetAll = () => {
    resetAllKeybinds();
    setKeybindsState(getKeybinds());
  };

  useEffect(() => {
    if (!editingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Backspace / Delete unbinds the shortcut.
      if (e.key === "Backspace" || e.key === "Delete") {
        setKeybind(editingAction, "");
        setKeybindsState(getKeybinds());
        setEditingAction(null);
        return;
      }

      const kb = eventToKeybind(e);
      if (!kb) return; // ignore standalone modifier

      setKeybind(editingAction, kb);
      setKeybindsState(getKeybinds());
      setEditingAction(null);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [editingAction]);

  const actions = Object.keys(KEYBIND_LABELS) as (keyof KeybindMap)[];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>

          <div className="space-y-1">
            {actions.map((action) => {
              const isEditing = editingAction === action;
              const isCustom = keybinds[action] !== DEFAULT_KEYBINDS[action];

              return (
                <div
                  key={action}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                    isEditing ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm">{KEYBIND_LABELS[action]}</span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <kbd className="inline-flex h-8 items-center rounded border border-accent bg-accent/10 px-3 text-xs font-mono text-accent animate-pulse">
                        Press a key… (⌫ to clear)
                      </kbd>
                    ) : keybinds[action] ? (
                      <kbd className="inline-flex h-8 items-center rounded border border-border bg-muted px-3 text-xs font-mono text-muted-foreground">
                        {formatKeybindDisplay(keybinds[action])}
                      </kbd>
                    ) : (
                      <span className="inline-flex h-8 items-center px-3 text-xs italic text-muted-foreground/70">
                        Not set
                      </span>
                    )}
                    {!isEditing && (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleStartEdit(action)} title="Edit">
                          <span className="text-xs">Edit</span>
                        </Button>
                        {isCustom && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleReset(action)} title="Reset to default">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                    {isEditing && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingAction(null)}>
                        <span className="text-xs">Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const FEEDBACK_TYPES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
];
const FEEDBACK_SUBJECTS: Record<string, string> = {
  general: "Feedback",
  bug: "Bug report",
  feature: "Feature request",
};

function BackupCard() {
  const toast = useToast();
  const canSync = useCan("sync");
  const status = useQuery(api.backups.backupStatus, {});
  const [busy, setBusy] = useState(false);

  const backupNow = async () => {
    setBusy(true);
    try {
      await maybeBackup(true);
      toast.success("Backed up");
    } catch {
      toast.error("Backup failed, try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Backup</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {canSync
              ? "Your data syncs live across your devices, and we keep a daily cloud snapshot you can fall back to."
              : "On Free, your data lives on this device. We keep a daily cloud snapshot so a browser-clear or a new device won't lose it - a point-in-time backup, not live sync. Upgrade to Pro for real-time sync across devices."}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {status === undefined
            ? "Checking backup…"
            : status
              ? `Last backup ${formatRelativePast(status.updatedAt)}.`
              : "No backup yet - it'll save automatically in a moment."}
        </p>

        <Button variant="outline" size="sm" onClick={backupNow} disabled={busy}>
          {busy ? "Backing up…" : "Back up now"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FeedbackSettings() {
  const toast = useToast();
  const { user } = useUser();
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const history = useQuery(api.feedback.myFeedback, {});
  const [type, setType] = useState<"general" | "bug" | "feature">("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Write a message first");
      return;
    }
    setSending(true);
    try {
      // Bug reports carry a sanitized env snapshot (counts/flags only, no content).
      const diagnostics = type === "bug" ? await collectDiagnostics() : undefined;
      await submitFeedback({
        type,
        message: trimmed,
        email: user?.primaryEmailAddress?.emailAddress,
        diagnostics,
      });
      setMessage("");
      toast.success(`${FEEDBACK_SUBJECTS[type]} sent - thank you!`);
    } catch {
      toast.error("Couldn't send feedback. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Found a bug or have an idea? Send it our way.
          </p>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <label className="text-sm font-medium">Type</label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "general" | "bug" | "feature")}
            options={FEEDBACK_TYPES}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind…"
            rows={6}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={!message.trim() || sending}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>

      {history && history.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-lg font-semibold">Your feedback</h3>
            <div className="space-y-2">
              {history.map((f) => (
                <div key={f._id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">{FEEDBACK_SUBJECTS[f.type] ?? f.type}</Badge>
                    <Badge variant={f.status === "open" ? "warning" : "success"} size="sm">
                      {f.status === "open" ? "Open" : "Resolved"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelativePast(f.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                  {f.adminReply && (
                    <div className="rounded-md bg-primary-light/50 p-2.5 text-sm">
                      <span className="text-xs font-medium text-primary">Reply from the team</span>
                      <p className="whitespace-pre-wrap mt-0.5">{f.adminReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Settings() {
  const {
    theme,
    setTheme,
    applyPreset,
    resetToDefault,
    importTheme,
    savedThemes,
    saveCurrentTheme,
    deleteSavedTheme,
  } = useTheme();
  const toast = useToast();
  const { user } = useUser();
  const { syncNow } = useOffline();
  const plan = usePlan();
  const canCustomTheme = useCan("themes.custom");
  const canSeed = isSeedAdmin(user?.primaryEmailAddress?.emailAddress);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedSync, setSeedSync] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string>("");
  const [seedArmed, setSeedArmed] = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleColorChange = (key: keyof ThemeColors, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    setTheme({ ...theme, [key]: hslValue });
  };

  const presetNames = Object.keys(PRESET_THEMES) as Array<keyof typeof PRESET_THEMES>;

  const activePresetName = presetNames.find((name) => {
    const preset = PRESET_THEMES[name];
    return (Object.keys(preset) as Array<keyof ThemeColors>).every(
      (k) => preset[k] === theme[k],
    );
  });

  const applyRandomPreset = useCallback(() => {
    const candidates = presetNames.filter((n) => n !== activePresetName);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    applyPreset(pick);
  }, [presetNames, activePresetName, applyPreset]);

  const generateRandomTheme = useCallback(() => {
    const hue1 = Math.floor(Math.random() * 360);
    // Complementary-ish hue for accent
    const hue2 = (hue1 + 150 + Math.floor(Math.random() * 60)) % 360;
    const isDark = Math.random() > 0.3;

    const bgL = isDark ? 3 + Math.floor(Math.random() * 8) : 95 + Math.floor(Math.random() * 5);
    const fgL = isDark ? 90 + Math.floor(Math.random() * 8) : 3 + Math.floor(Math.random() * 8);
    const primaryS = 60 + Math.floor(Math.random() * 40);
    const primaryL = isDark ? 55 + Math.floor(Math.random() * 20) : 35 + Math.floor(Math.random() * 20);
    const accentS = 50 + Math.floor(Math.random() * 40);
    const accentL = isDark ? 55 + Math.floor(Math.random() * 20) : 45 + Math.floor(Math.random() * 20);
    const lightL = isDark ? 14 + Math.floor(Math.random() * 6) : 94 + Math.floor(Math.random() * 4);

    setTheme({
      background: `${hue1} ${isDark ? 10 + Math.floor(Math.random() * 20) : 0}% ${bgL}%`,
      foreground: `${hue1} ${Math.floor(Math.random() * 15)}% ${fgL}%`,
      primary: `${hue1} ${primaryS}% ${primaryL}%`,
      accent: `${hue2} ${accentS}% ${accentL}%`,
      primaryLight: `${hue1} ${Math.min(primaryS, 85)}% ${lightL}%`,
      accentLight: `${hue2} ${Math.min(accentS, 85)}% ${lightL}%`,
    });
  }, [setTheme]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(THEME_AI_PROMPT);
      setPromptCopied(true);
      toast.success("Prompt copied. Paste it into your favorite AI.");
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy manually.");
    }
  };

  const handleApplyPasted = () => {
    const success = importTheme(importText);
    if (success) {
      setImportText("");
      setImportError("");
      toast.success("Theme applied.");
    } else {
      setImportError("That doesn't look like a valid theme. Check the JSON and try again.");
    }
  };

  const handleSaveTheme = () => {
    const name = saveName.trim();
    if (!name) return;
    saveCurrentTheme(name);
    setSaveName("");
    toast.success(`Saved "${name}".`);
  };

  // Two-click confirm (native window.confirm is suppressed in some browsers).
  const handleSeed = () => {
    if (seeding) return;
    if (!seedArmed) {
      setSeedArmed(true);
      setSeedStatus(
        seedSync
          ? "Click again to confirm - this wipes ALL data, then seeds and syncs."
          : "Click again to confirm - this wipes ALL current data, then seeds.",
      );
      if (armRef.current) clearTimeout(armRef.current);
      armRef.current = setTimeout(() => { setSeedArmed(false); setSeedStatus(""); }, 5000);
      return;
    }
    if (armRef.current) clearTimeout(armRef.current);
    setSeedArmed(false);
    void runSeed();
  };

  const runSeed = async () => {
    setSeeding(true);
    setSeedStatus("Seeding…");
    try {
      // Write local data first - this is what shows up in the UI immediately.
      const r = await seedDemoData({ sync: seedSync });
      const summary = `Seeded ${r.paths} paths, ${r.steps} steps, ${r.routines} routines, ${r.reminders} reminders, ${r.notebooks} notebooks, ${r.notes} notes.`;
      toast.success(summary);
      setSeedStatus(summary);
      // Push in the background so the button never blocks on the network.
      if (seedSync) {
        setSeedStatus(summary + " Syncing…");
        syncNow()
          .then(() => setSeedStatus(summary + " Synced ✓"))
          .catch((e) => { console.error(e); setSeedStatus(summary + " Sync failed (see console)"); toast.error("Sync failed."); });
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Seeding failed. Check the console.");
      setSeedStatus("Seeding failed: " + msg);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="theme">
        <TabsList className="mb-4">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="keybinds">Keybinds</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            {/* Install card removed for now; PWA plumbing kept in vite.config. */}
            <GeneralSettings />
          </div>
        </TabsContent>

        <TabsContent value="keybinds">
          <KeybindSettings />
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-6">
            <BackupCard />
            <DataSettings />
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackSettings />
        </TabsContent>

        <TabsContent value="theme">
        <div className="space-y-6">

      {/* Preset Themes */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Preset Themes</h2>
            {canCustomTheme && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generateRandomTheme}>
                  <Dices className="w-4 h-4 mr-2" />
                  Random Colors
                </Button>
                <Button variant="outline" size="sm" onClick={applyRandomPreset}>
                  <Shuffle className="w-4 h-4 mr-2" />
                  Shuffle
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {presetNames.map((presetName) => {
              const preset = PRESET_THEMES[presetName];
              const isActive = presetName === activePresetName;
              const locked = !canUseTheme(plan, presetName);
              return (
                <button
                  key={presetName}
                  onClick={() =>
                    locked
                      ? window.open("https://voidsteps.com/#pricing", "_blank", "noopener")
                      : applyPreset(presetName)
                  }
                  title={locked ? "Pro theme, upgrade to unlock" : undefined}
                  className={`group relative rounded-lg border-2 p-3 text-left transition-all hover:scale-[1.02] ${
                    isActive
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-muted-foreground/40"
                  } ${locked ? "opacity-60" : ""}`}
                  style={{ backgroundColor: `hsl(${preset.background})` }}
                >
                  {locked && (
                    <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-background/80 p-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </span>
                  )}
                  {/* 4 brand swatches: primary, accent + their lights */}
                  <div className="flex gap-1 mb-2">
                    {(["primary", "accent", "primaryLight", "accentLight"] as const).map((token) => (
                      <div
                        key={token}
                        className="h-4 flex-1 rounded-sm"
                        style={{ backgroundColor: `hsl(${preset[token]})` }}
                      />
                    ))}
                  </div>
                  {/* Foreground tone line */}
                  <div
                    className="h-1.5 mb-2 rounded-sm"
                    style={{ backgroundColor: `hsl(${preset.foreground} / 0.15)` }}
                  />
                  {/* Label */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium capitalize truncate"
                      style={{ color: `hsl(${preset.foreground})` }}
                    >
                      {presetName.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: `hsl(${preset.primary})` }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {canCustomTheme ? (
      <>
      {/* Custom Colors - Tab-grouped */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Custom Colors</h2>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pick your colors. Everything else in the app adjusts to match.
          </p>
          <ColorGroup
            keys={["background", "foreground", "primary", "accent", "primaryLight", "accentLight"]}
            theme={theme}
            labels={COLOR_LABELS}
            onColorChange={handleColorChange}
            onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
          />

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()}
                placeholder="Name this theme to save it"
              />
            </div>
            <Button onClick={handleSaveTheme} disabled={!saveName.trim()} className="shrink-0">
              <Save className="mr-2 h-4 w-4" />
              Save theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Themes - saved custom themes */}
      {savedThemes.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">My Themes</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {savedThemes.map((saved) => {
                const c = saved.colors;
                const isActive = (Object.keys(c) as Array<keyof ThemeColors>).every(
                  (k) => c[k] === theme[k],
                );
                return (
                  <div
                    key={saved.id}
                    className={`group relative rounded-lg border-2 p-3 transition-all ${
                      isActive
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                    style={{ backgroundColor: `hsl(${c.background})` }}
                  >
                    <button
                      onClick={() => setTheme(c)}
                      className="block w-full text-left transition-transform hover:scale-[1.02]"
                    >
                      <div className="mb-2 flex gap-1">
                        {(["primary", "accent", "primaryLight", "accentLight"] as const).map((token) => (
                          <div
                            key={token}
                            className="h-4 flex-1 rounded-sm"
                            style={{ backgroundColor: `hsl(${c[token]})` }}
                          />
                        ))}
                      </div>
                      <div
                        className="mb-2 h-1.5 rounded-sm"
                        style={{ backgroundColor: `hsl(${c.foreground} / 0.15)` }}
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="truncate text-xs font-medium"
                          style={{ color: `hsl(${c.foreground})` }}
                        >
                          {saved.name}
                        </span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: `hsl(${c.primary})` }} />
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSavedTheme(saved.id)}
                      aria-label={`Delete ${saved.name}`}
                      className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Theme Designer */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Design a theme with AI</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy the prompt below, paste it into your favorite AI (ChatGPT, Claude, Gemini),
            describe the vibe you want, then paste its JSON answer here to apply.
          </p>

          {/* Step 1 - copy prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">1. Copy this prompt</span>
              <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                {promptCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {promptCopied ? "Copied" : "Copy prompt"}
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
              {THEME_AI_PROMPT}
            </pre>
          </div>

          {/* Step 2 - paste result */}
          <div className="space-y-2">
            <span className="text-sm font-medium">2. Paste the AI's answer</span>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError("");
              }}
              placeholder='{ "background": "...", "foreground": "...", "primary": "..." }'
              className="h-32 w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-sm"
            />
            {importError && <p className="text-sm text-destructive">{importError}</p>}
            <Button
              onClick={handleApplyPasted}
              disabled={!importText.trim()}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Apply theme
            </Button>
          </div>
        </CardContent>
      </Card>
      </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
              <Lock className="h-5 w-5 text-primary" />
            </span>
            <h2 className="text-xl font-semibold">Custom themes are a Pro feature</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Free includes the two starter themes above. Upgrade to Pro to unlock
              all presets, the custom color editor, saved themes, and AI theme design.
            </p>
            <a
              href="https://voidsteps.com/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Upgrade to Pro
            </a>
          </CardContent>
        </Card>
      )}

      {/* Demo data - owner only, for screenshots */}
      {canSeed && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Demo data</h2>
            <p className="text-sm text-muted-foreground">
              Wipes everything, then populates this account with a polished set of paths, steps,
              routines, and notes (with 30 days of history for analytics) for screenshots.
            </p>
            <Toggle
              checked={seedSync}
              onChange={(e) => setSeedSync(e.target.checked)}
              size="sm"
              label="Sync seeded data to the server"
              description={seedSync
                ? "On: pushed via batch sync (syncs across devices)."
                : "Off: local-only (faster, best for screenshots)."}
            />
            <Button
              variant={seedArmed ? "destructive" : "outline"}
              onClick={handleSeed}
              loading={seeding}
              disabled={seeding}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {seeding ? "Seeding…" : seedArmed ? "Click again to confirm" : "Seed demo data"}
            </Button>
            {seedStatus && (
              <p className="text-sm text-muted-foreground">{seedStatus}</p>
            )}
          </CardContent>
        </Card>
      )}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorGroup({
  keys,
  theme,
  labels,
  onColorChange,
  onHslChange,
}: {
  keys: (keyof ThemeColors)[];
  theme: ThemeColors;
  labels: Record<keyof ThemeColors, string>;
  onColorChange: (key: keyof ThemeColors, hex: string) => void;
  onHslChange: (key: keyof ThemeColors, val: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {keys.map((key) => (
        <div key={String(key)} className="space-y-2">
          <label className="text-sm font-medium">{labels[key]}</label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={hslToHex(theme[key] ?? "0 0% 0%")}
              onChange={(e) => onColorChange(key, e.target.value)}
              className="swatch-input h-11 w-12 cursor-pointer overflow-hidden rounded-md border border-input"
            />
            <input
              value={theme[key] ?? ""}
              onChange={(e) => onHslChange(key, e.target.value)}
              placeholder="H S% L%"
              className="flex-1 h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
