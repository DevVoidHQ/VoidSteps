import { useState, useCallback } from "react";
import { useTheme, PRESET_THEMES } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/contexts/ThemeContext";
import { useOffline } from "@/contexts/OfflineContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Download, Upload, RotateCcw, Shuffle, Dices, Check, Wifi, WifiOff, RefreshCw, Trash2, Bug } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { reportError } from "@/lib/error-store";

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: "Background",
  foreground: "Foreground",
  card: "Card",
  cardForeground: "Card Foreground",
  popover: "Popover",
  popoverForeground: "Popover Foreground",
  primary: "Primary",
  primaryForeground: "Primary Foreground",
  secondary: "Secondary",
  secondaryForeground: "Secondary Foreground",
  muted: "Muted",
  mutedForeground: "Muted Foreground",
  accent: "Accent",
  accentForeground: "Accent Foreground",
  destructive: "Destructive",
  destructiveForeground: "Destructive Foreground",
  border: "Border",
  input: "Input",
  ring: "Ring",
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

  const recentErrors = useLiveQuery(
    () => db.errorLog.orderBy('timestamp').reverse().limit(20).toArray(),
    []
  );

  const retryFailed = async () => {
    await db.syncQueue.where('status').equals('failed').modify({ status: 'pending', retryCount: 0 });
  };

  const purgeFailed = async () => {
    await db.syncQueue.where('status').equals('failed').delete();
  };

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
                <Button variant="outline" size="sm" onClick={retryFailed}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry failed ({failedSyncCount})
                </Button>
                <Button variant="outline" size="sm" onClick={purgeFailed}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard failed
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
    const hue = Math.floor(Math.random() * 360);
    // Offset hues for secondary & accent to keep things harmonious
    const hue2 = (hue + 30 + Math.floor(Math.random() * 60)) % 360;
    const hue3 = (hue + 150 + Math.floor(Math.random() * 60)) % 360;
    const isDark = Math.random() > 0.3; // 70% chance dark theme

    const bgL = isDark ? 3 + Math.floor(Math.random() * 8) : 95 + Math.floor(Math.random() * 5);
    const fgL = isDark ? 90 + Math.floor(Math.random() * 8) : 3 + Math.floor(Math.random() * 8);
    const cardL = isDark ? bgL + 3 + Math.floor(Math.random() * 4) : bgL - 2 - Math.floor(Math.random() * 3);
    const mutedL = isDark ? 15 + Math.floor(Math.random() * 8) : 90 + Math.floor(Math.random() * 6);
    const mutedFgL = isDark ? 55 + Math.floor(Math.random() * 15) : 35 + Math.floor(Math.random() * 15);
    const borderL = isDark ? 18 + Math.floor(Math.random() * 10) : 82 + Math.floor(Math.random() * 10);
    const primaryS = 60 + Math.floor(Math.random() * 40);
    const primaryL = isDark ? 55 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 15);

    const generated: ThemeColors = {
      background: `${hue} ${isDark ? 10 + Math.floor(Math.random() * 20) : 0}% ${bgL}%`,
      foreground: `${hue} ${Math.floor(Math.random() * 15)}% ${fgL}%`,
      card: `${hue} ${isDark ? 10 + Math.floor(Math.random() * 15) : 0}% ${cardL}%`,
      cardForeground: `${hue} ${Math.floor(Math.random() * 15)}% ${fgL}%`,
      popover: `${hue} ${isDark ? 10 + Math.floor(Math.random() * 15) : 0}% ${cardL}%`,
      popoverForeground: `${hue} ${Math.floor(Math.random() * 15)}% ${fgL}%`,
      primary: `${hue} ${primaryS}% ${primaryL}%`,
      primaryForeground: `${hue} ${Math.floor(Math.random() * 10)}% ${isDark ? bgL : 98}%`,
      secondary: `${hue2} ${50 + Math.floor(Math.random() * 40)}% ${isDark ? 45 + Math.floor(Math.random() * 15) : 35 + Math.floor(Math.random() * 15)}%`,
      secondaryForeground: `${hue} ${Math.floor(Math.random() * 10)}% ${isDark ? fgL : 98}%`,
      muted: `${hue} ${Math.floor(Math.random() * 15)}% ${mutedL}%`,
      mutedForeground: `${hue} ${Math.floor(Math.random() * 15)}% ${mutedFgL}%`,
      accent: `${hue3} ${50 + Math.floor(Math.random() * 40)}% ${isDark ? 50 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 15)}%`,
      accentForeground: `${hue} ${Math.floor(Math.random() * 10)}% ${isDark ? bgL : 98}%`,
      destructive: `${350 + Math.floor(Math.random() * 20)} ${70 + Math.floor(Math.random() * 25)}% ${55 + Math.floor(Math.random() * 15)}%`,
      destructiveForeground: `${hue} ${Math.floor(Math.random() * 10)}% ${fgL}%`,
      border: `${hue} ${Math.floor(Math.random() * 15)}% ${borderL}%`,
      input: `${hue} ${Math.floor(Math.random() * 15)}% ${borderL}%`,
      ring: `${hue} ${primaryS}% ${primaryL}%`,
    };
    setTheme(generated);
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
          <TabsTrigger value="sync">Sync & Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <SyncAndErrors />
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
                  {/* Color swatch row */}
                  <div className="flex gap-1 mb-2">
                    {(["primary", "secondary", "accent", "destructive"] as const).map((token) => (
                      <div
                        key={token}
                        className="h-4 flex-1 rounded-sm"
                        style={{ backgroundColor: `hsl(${preset[token]})` }}
                      />
                    ))}
                  </div>
                  {/* Muted bar to show card/muted tones */}
                  <div className="flex gap-1 mb-2">
                    <div className="h-1.5 flex-[2] rounded-sm" style={{ backgroundColor: `hsl(${preset.muted})` }} />
                    <div className="h-1.5 flex-1 rounded-sm" style={{ backgroundColor: `hsl(${preset.border})` }} />
                  </div>
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

          <Tabs defaultValue="core">
            <TabsList>
              <TabsTrigger value="core">Core</TabsTrigger>
              <TabsTrigger value="brand">Brand</TabsTrigger>
              <TabsTrigger value="ui">UI</TabsTrigger>
            </TabsList>
            <TabsContent value="core">
              <ColorGroup
                keys={["background", "foreground", "card", "cardForeground", "popover", "popoverForeground"]}
                theme={theme}
                labels={COLOR_LABELS}
                onColorChange={handleColorChange}
                onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
              />
            </TabsContent>
            <TabsContent value="brand">
              <ColorGroup
                keys={["primary", "primaryForeground", "secondary", "secondaryForeground", "accent", "accentForeground", "destructive", "destructiveForeground"]}
                theme={theme}
                labels={COLOR_LABELS}
                onColorChange={handleColorChange}
                onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
              />
            </TabsContent>
            <TabsContent value="ui">
              <ColorGroup
                keys={["muted", "mutedForeground", "border", "input", "ring"]}
                theme={theme}
                labels={COLOR_LABELS}
                onColorChange={handleColorChange}
                onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
              />
            </TabsContent>
          </Tabs>
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
              value={hslToHex(theme[key])}
              onChange={(e) => onColorChange(key, e.target.value)}
              className="w-12 h-10 rounded border border-input cursor-pointer"
            />
            <input
              value={theme[key]}
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
