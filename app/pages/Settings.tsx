import { useSearchParams } from "react-router-dom";
import KeyReference from "@/components/settings/KeyReference";
import { HslPicker } from "@/components/settings/HslPicker";
import NotesExportCard from "@/components/NotesExportCard";
import BackupCard from "@/components/BackupCard";
import DataSettings from "@/components/DataSettings";
import FocusSettings from "@/components/FocusSettings";
import FeedbackSettings from "@/components/settings/FeedbackSettings";
import GeneralSettings from "@/components/settings/GeneralSettings";
import KeybindSettings from "@/components/settings/KeybindSettings";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import UpdateSettings from "@/components/UpdateSettings";
import type { ThemeColors } from "@/contexts/ThemeContext";
import { PRESET_THEMES, useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { seedDemoData } from "@/lib/seed-demo";
import { THEME_AI_PROMPT } from "@/lib/theme-ai-prompt";
import { Check, Copy, Dices, RotateCcw, Save, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// Every theme is exactly 4 colors. Everything else derives from these.
const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  background: "Background",
  foreground: "Foreground",
  primary: "Primary",
  accent: "Accent",
};

// Helper to convert HSL string to hex for color input
const hslToHex = (hsl: string): string => {
  const parts = hsl.split(" ");
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

    const q =
      lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
    const p = 2 * lDecimal - q;

    r = hue2rgb(p, q, hDecimal + 1 / 3);
    g = hue2rgb(p, q, hDecimal);
    b = hue2rgb(p, q, hDecimal - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const SETTINGS_TABS = ["theme", "general", "focus", "keybinds", "data", "feedback"];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = requested && SETTINGS_TABS.includes(requested) ? requested : "theme";
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
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string>("");
  const [seedArmed, setSeedArmed] = useState(false);
  const armRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presetNames = Object.keys(PRESET_THEMES) as Array<keyof typeof PRESET_THEMES>;

  const activePresetName = presetNames.find((name) => {
    const preset = PRESET_THEMES[name];
    return (Object.keys(preset) as Array<keyof ThemeColors>).every((k) => preset[k] === theme[k]);
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
    const primaryL = isDark
      ? 55 + Math.floor(Math.random() * 20)
      : 35 + Math.floor(Math.random() * 20);
    const accentS = 50 + Math.floor(Math.random() * 40);
    const accentL = isDark
      ? 55 + Math.floor(Math.random() * 20)
      : 45 + Math.floor(Math.random() * 20);

    setTheme({
      background: `${hue1} ${isDark ? 10 + Math.floor(Math.random() * 20) : 0}% ${bgL}%`,
      foreground: `${hue1} ${Math.floor(Math.random() * 15)}% ${fgL}%`,
      primary: `${hue1} ${primaryS}% ${primaryL}%`,
      accent: `${hue2} ${accentS}% ${accentL}%`,
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
      setSeedStatus("Click again to confirm - this wipes ALL current data, then seeds.");
      if (armRef.current) clearTimeout(armRef.current);
      armRef.current = setTimeout(() => {
        setSeedArmed(false);
        setSeedStatus("");
      }, 5000);
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
      const r = await seedDemoData();
      const summary = `Seeded ${r.paths} paths, ${r.steps} steps, ${r.routines} routines, ${r.reminders} reminders, ${r.notebooks} notebooks, ${r.notes} notes.`;
      toast.success(summary);
      setSeedStatus(summary);
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
      <h1 className="type-page">Settings</h1>

      {/* The open tab lives in the URL, so other places can link straight to
          one (the shortcuts panel links to Keybinds). */}
      <Tabs
        defaultValue="theme"
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="focus">Focus</TabsTrigger>
          <TabsTrigger value="keybinds">Keybinds</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            {/* Install card removed for now; PWA plumbing kept in vite.config. */}
            <GeneralSettings />
            <UpdateSettings />
          </div>
        </TabsContent>

        <TabsContent value="focus">
          <Card>
            <CardContent className="p-6">
              <FocusSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keybinds">
          <div className="space-y-6">
            <KeybindSettings />
            <KeyReference />
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-6">
            <NotesExportCard />
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
                  <h2 className="type-section">Preset Themes</h2>
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
                            : "border-transparent shadow-elev-1 hover:shadow-elev-2"
                        }`}
                        style={{ backgroundColor: `hsl(${preset.background})` }}
                      >
                        {/* Brand swatches: primary and accent */}
                        <div className="flex gap-1 mb-2">
                          {(["primary", "accent"] as const).map((token) => (
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
                            className="type-label capitalize truncate"
                            style={{ color: `hsl(${preset.foreground})` }}
                          >
                            {presetName.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          {isActive && (
                            <Check
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: `hsl(${preset.primary})` }}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Custom Colors - Tab-grouped */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="type-section">Custom Colors</h2>
                  <Button variant="outline" size="sm" onClick={resetToDefault}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <p className="type-meta text-muted-foreground">
                  Pick your colors. Everything else in the app adjusts to match.
                </p>
                <ColorGroup
                  keys={["background", "foreground", "primary", "accent"]}
                  theme={theme}
                  labels={COLOR_LABELS}
                  onHslChange={(key, val) => setTheme({ ...theme, [key]: val })}
                />

                <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()}
                      placeholder="Name this theme to save it"
                    />
                  </div>
                  <Button
                    onClick={handleSaveTheme}
                    disabled={!saveName.trim()}
                    className="shrink-0"
                  >
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
                  <h2 className="type-section">My Themes</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {savedThemes.map((saved) => {
                      const c = saved.colors;
                      const isActive = (Object.keys(c) as Array<keyof ThemeColors>).every(
                        (k) => c[k] === theme[k]
                      );
                      return (
                        <div
                          key={saved.id}
                          className={`group relative rounded-lg border-2 p-3 transition-all ${
                            isActive
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent shadow-elev-1 hover:shadow-elev-2"
                          }`}
                          style={{ backgroundColor: `hsl(${c.background})` }}
                        >
                          <button
                            onClick={() => setTheme(c)}
                            className="block w-full text-left transition-transform hover:scale-[1.02]"
                          >
                            <div className="mb-2 flex gap-1">
                              {(["primary", "accent"] as const).map((token) => (
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
                                className="truncate type-label"
                                style={{ color: `hsl(${c.foreground})` }}
                              >
                                {saved.name}
                              </span>
                              {isActive && (
                                <Check
                                  className="h-3.5 w-3.5 shrink-0"
                                  style={{ color: `hsl(${c.primary})` }}
                                />
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => deleteSavedTheme(saved.id)}
                            aria-label={`Delete ${saved.name}`}
                            className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive-ink group-hover:opacity-100"
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
                  <h2 className="type-section">Design a theme with AI</h2>
                </div>
                <p className="type-body text-muted-foreground">
                  Copy the prompt below, paste it into your favorite AI (ChatGPT, Claude, Gemini),
                  describe the vibe you want, then paste its JSON answer here to apply.
                </p>

                {/* Step 1 - copy prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="type-label">1. Copy this prompt</span>
                    <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                      {promptCopied ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {promptCopied ? "Copied" : "Copy prompt"}
                    </Button>
                  </div>
                  <pre className="max-h-40 overflow-auto rounded-md bg-field p-3 type-meta text-muted-foreground whitespace-pre-wrap">
                    {THEME_AI_PROMPT}
                  </pre>
                </div>

                {/* Step 2 - paste result */}
                <div className="space-y-2">
                  <span className="type-label">2. Paste the AI's answer</span>
                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setImportError("");
                    }}
                    placeholder='{ "background": "...", "foreground": "...", "primary": "..." }'
                    className="h-32 w-full resize-none rounded-md border-transparent bg-field p-3 font-mono type-body"
                  />
                  {importError && <p className="type-body text-destructive-ink">{importError}</p>}
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
            {/* Demo data - dev builds only, for screenshots */}
            {import.meta.env.DEV && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <h2 className="type-section">Demo data</h2>
                  <p className="type-body text-muted-foreground">
                    Wipes everything, then populates the app with a polished set of paths, steps,
                    routines, and notes (with 30 days of history for analytics) for screenshots.
                  </p>
                  <Button
                    variant={seedArmed ? "destructive" : "outline"}
                    onClick={handleSeed}
                    loading={seeding}
                    disabled={seeding}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {seeding ? "Seeding…" : seedArmed ? "Click again to confirm" : "Seed demo data"}
                  </Button>
                  {seedStatus && <p className="type-body text-muted-foreground">{seedStatus}</p>}
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
  onHslChange,
}: {
  keys: (keyof ThemeColors)[];
  theme: ThemeColors;
  labels: Record<keyof ThemeColors, string>;
  onHslChange: (key: keyof ThemeColors, val: string) => void;
}) {
  // The picker comes first: each colour is a big swatch that opens an in-app
  // picker. The typed value is there for exact edits.
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {keys.map((key) => {
        const value = theme[key] ?? "0 0% 0%";
        const hex = hslToHex(value);
        return (
          <div key={String(key)} className="space-y-2">
            <HslPicker
              label={labels[key]}
              value={value}
              hex={hex}
              onChange={(hsl) => onHslChange(key, hsl)}
            />
            <div className="type-label">{labels[key]}</div>
            <input
              aria-label={`${labels[key]} HSL value`}
              value={theme[key] ?? ""}
              onChange={(e) => onHslChange(key, e.target.value)}
              placeholder="H S% L%"
              className="h-8 w-full rounded-md bg-field px-2 font-mono type-meta text-muted-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        );
      })}
    </div>
  );
}
