import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  DEFAULT_KEYBINDS,
  eventToKeybind,
  formatKeybindDisplay,
  getKeybinds,
  KEYBIND_LABELS,
  resetAllKeybinds,
  resetKeybind,
  setKeybind,
  type KeybindMap,
} from "@/lib/keybind-config";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

export default function KeybindSettings() {
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleStartEdit(action)}
                          title="Edit"
                        >
                          <span className="text-xs">Edit</span>
                        </Button>
                        {isCustom && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleReset(action)}
                            title="Reset to default"
                          >
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
