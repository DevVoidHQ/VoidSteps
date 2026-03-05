import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { formatDuration } from "@/hooks/useTimer";
import { RotateCcw, X } from "lucide-react";

interface TimeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTimeMs: number;
  isTimerRunning: boolean;
  onApply: (newTotalMs: number) => void;
}

function msToHMS(ms: number): { h: number; m: number; s: number } {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

function hmsToMs(h: number, m: number, s: number): number {
  return (h * 3600 + m * 60 + s) * 1000;
}

export function TimeEditDialog({
  open,
  onOpenChange,
  currentTimeMs,
  isTimerRunning,
  onApply,
}: TimeEditDialogProps) {
  const [mode, setMode] = useState<"add" | "set">("add");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMode("add");
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      setShowResetConfirm(false);
    }
  }, [open]);

  const clampValue = useCallback((value: string, max: number): number => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return 0;
    return Math.min(num, max);
  }, []);

  const handleApply = useCallback(() => {
    const inputMs = hmsToMs(hours, minutes, seconds);
    if (mode === "add") {
      onApply(currentTimeMs + inputMs);
    } else {
      onApply(inputMs);
    }
    onOpenChange(false);
  }, [mode, hours, minutes, seconds, currentTimeMs, onApply, onOpenChange]);

  const handleReset = useCallback(() => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    onApply(0);
    onOpenChange(false);
  }, [showResetConfirm, onApply, onOpenChange]);

  const inputMs = hmsToMs(hours, minutes, seconds);
  const isApplyDisabled = isTimerRunning || (mode === "add" && inputMs === 0);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent size="sm">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Time Tracked</DialogTitle>
          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label="Close"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          />
        </DialogHeader>

        <div className="space-y-4">
          {/* Current time display */}
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-mono font-medium text-foreground">{formatDuration(currentTimeMs)}</span>
          </div>

          {isTimerRunning ? (
            <div className="text-sm text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
              Stop the timer before editing time manually.
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="time-mode"
                    checked={mode === "add"}
                    onChange={() => {
                      setMode("add");
                      setHours(0);
                      setMinutes(0);
                      setSeconds(0);
                    }}
                    className="accent-primary"
                  />
                  Add time
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="time-mode"
                    checked={mode === "set"}
                    onChange={() => {
                      setMode("set");
                      const { h, m, s } = msToHMS(currentTimeMs);
                      setHours(h);
                      setMinutes(m);
                      setSeconds(s);
                    }}
                    className="accent-primary"
                  />
                  Set to
                </label>
              </div>

              {/* Time inputs */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={hours || ""}
                    placeholder="0"
                    onChange={(e) => setHours(clampValue(e.target.value, 999))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes || ""}
                    placeholder="0"
                    onChange={(e) => setMinutes(clampValue(e.target.value, 59))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Sec</label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds || ""}
                    placeholder="0"
                    onChange={(e) => setSeconds(clampValue(e.target.value, 59))}
                  />
                </div>
              </div>

              {/* Preview of result */}
              {inputMs > 0 && (
                <div className="text-xs text-muted-foreground">
                  {mode === "add"
                    ? `New total: ${formatDuration(currentTimeMs + inputMs)}`
                    : `Will set to: ${formatDuration(inputMs)}`}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isTimerRunning || currentTimeMs === 0}
            className="mr-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {showResetConfirm ? "Confirm Reset" : "Reset"}
          </Button>
          <Button
            onClick={handleApply}
            disabled={isApplyDisabled}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
