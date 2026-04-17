import { useState, useCallback, useEffect } from "react";
import { useTheme, PRESET_THEMES } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/contexts/ThemeContext";
import { useOffline } from "@/contexts/OfflineContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Download, Upload, RotateCcw, Shuffle, Dices, Check, Wifi, WifiOff, RefreshCw, Trash2, Bug, Eye } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { reportError } from "@/lib/error-store";
import { retryAllFailed, discardAllFailed } from "@/lib/sync-queue-actions";
import FailedSyncReviewDialog from "@/components/FailedSyncReviewDialog";
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

function SyncAndErrors() {
  const { isOnline, pendingSyncCount, failedSyncCount } = useOffline();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const recentErrors = useLiveQuery(
    () => db.errorLog.orderBy('timestamp').reverse().limit(20).toArray(),
    []
  );

  const clearErrorLog = async () => {
    await db.errorLog.clear();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Sync Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-destructive" />}
              <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Pending: {pendingSyncCount}
            </div>
            <div className="text-sm text-muted-foreground">
              Failed: {failedSyncCount}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {failedSyncCount > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsReviewOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Review failed ({failedSyncCount})
                </Button>
                <Button variant="outline" size="sm" onClick={retryAllFailed}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry all
                </Button>
                <Button variant="outline" size="sm" onClick={discardAllFailed}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard all
                </Button>
              </>
            )}
            {import.meta.env.DEV && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reportError('mutation', new Error('Test error from Settings'), { action: 'sentryTest' })}
              >
                <Bug className="w-4 h-4 mr-2" />
                Test Sentry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error log — only visible in dev mode */}
      {import.meta.env.DEV && recentErrors && recentErrors.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Error Log (dev only)</h2>
              <Button variant="ghost" size="sm" onClick={clearErrorLog}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentErrors.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 text-xs text-muted-foreground">
                  <span className="font-mono">{entry.category}</span>
                  <span className="truncate flex-1">{entry.message}</span>
                  <span className="shrink-0">{formatTimestamp(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <FailedSyncReviewDialog open={isReviewOpen} onOpenChange={setIsReviewOpen} />
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
        <CardContent className="p-6 space-y-4">
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
                    isEditing ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm">{KEYBIND_LABELS[action]}</span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <kbd className="inline-flex h-8 items-center rounded border border-primary bg-primary/10 px-3 text-xs font-mono text-primary animate-pulse">
                        Press a key...
                      </kbd>
                    ) : (
                      <kbd className="inline-flex h-8 items-center rounded border border-border bg-muted px-3 text-xs font-mono text-muted-foreground">
                        {formatKeybindDisplay(keybinds[action])}
                      </kbd>
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

export default function Settings() {
  const { theme, setTheme, applyPreset, resetToDefault, exportTheme, importTheme } = useTheme();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

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

  const handleExport = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const success = importTheme(importText);
    if (success) {
      setImportText("");
      setImportError("");
    } else {
      setImportError("Invalid theme JSON. Please check the format.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-center">Settings</h1>

      <Tabs defaultValue="theme">
        <TabsList className="mb-4">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="keybinds">Keybinds</TabsTrigger>
          <TabsTrigger value="sync">Sync & Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <SyncAndErrors />
        </TabsContent>

        <TabsContent value="keybinds">
          <KeybindSettings />
        </TabsContent>

        <TabsContent value="theme">
        <div className="space-y-6">

      {/* Preset Themes */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Preset Themes</h2>
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
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {presetNames.map((presetName) => {
              const preset = PRESET_THEMES[presetName];
              const isActive = presetName === activePresetName;
              return (
                <button
                  key={presetName}
                  onClick={() => applyPreset(presetName)}
                  className={`group relative rounded-lg border-2 p-3 text-left transition-all hover:scale-[1.02] ${
                    isActive
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                  style={{ backgroundColor: `hsl(${preset.background})` }}
                >
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

      {/* Custom Colors — Tab-grouped */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Custom Colors</h2>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Every theme is 6 colors. Borders, cards, muted surfaces, destructive and secondary
            all derive from these automatically.
          </p>
          <ColorGroup
            keys={["background", "foreground", "primary", "accent", "primaryLight", "accentLight"]}
            theme={theme}
            labels={COLOR_LABELS}
            onColorChange={handleColorChange}
            onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
          />
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Import/Export Theme</h2>

          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Theme
              </Button>
            </div>

            <div className="space-y-2">
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError("");
                }}
                placeholder="Paste theme JSON here..."
                className="w-full h-32 p-3 rounded-md border border-input bg-background text-sm font-mono resize-none"
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
              <Button
                variant="outline"
                onClick={handleImport}
                disabled={!importText.trim()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Theme
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Preview</h2>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="font-medium">Card Component</p>
                <p className="text-sm text-muted-foreground">This is how cards will look with your theme</p>
              </CardContent>
            </Card>
            <Input placeholder="Input field example" />
          </div>
        </CardContent>
      </Card>
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
              className="w-12 h-10 rounded border border-input cursor-pointer"
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
