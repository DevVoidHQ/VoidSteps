import { useState } from "react";
import { useTheme, PRESET_THEMES } from "@/contexts/ThemeContext";
import type { ThemeColors } from "@/contexts/ThemeContext";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import { Download, Upload, RotateCcw, Palette } from "lucide-react";

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

export default function Settings() {
  const { theme, setTheme, applyPreset, resetToDefault, exportTheme, importTheme } = useTheme();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const handleColorChange = (key: keyof ThemeColors, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    setTheme({ ...theme, [key]: hslValue });
  };

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
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold flex items-center justify-center space-x-3">
          <Palette className="w-8 h-8" />
          <span>Theme Settings</span>
        </h1>
        <p className="text-muted-foreground">
          Customize your color scheme
        </p>
      </div>

      {/* Preset Themes */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Preset Themes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.keys(PRESET_THEMES).map((presetName) => (
              <Button
                key={presetName}
                variant="outline"
                onClick={() => applyPreset(presetName)}
                className="capitalize"
              >
                {presetName}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Custom Colors</h2>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(theme) as Array<keyof ThemeColors>).map((key) => (
              <div key={String(key)} className="space-y-2">
                <label className="text-sm font-medium">{COLOR_LABELS[key]}</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={hslToHex(theme[key])}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-12 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={theme[key]}
                    onChange={(e) => setTheme({ ...theme, [key]: e.target.value })}
                    placeholder="H S% L%"
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
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
  );
}
