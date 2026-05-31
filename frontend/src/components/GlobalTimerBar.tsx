import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Timer, Pause, Play, Square, CheckCircle2, Maximize2, X } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import {
  useStartTimer,
  useStopTimer,
  useToggleStepCompletion,
} from "@/lib/local-mutations";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { useElapsedTime } from "@/hooks/useTimer";
import { IconButton } from "@/components/ui/IconButton";
import type { Step } from "@/types/index";

const FOCUS_STEP_KEY = "voidsteps-timer-focus-step";

function readFocusId(): string | null {
  try {
    return localStorage.getItem(FOCUS_STEP_KEY);
  } catch {
    return null;
  }
}

function writeFocusId(id: string | null) {
  try {
    if (id) localStorage.setItem(FOCUS_STEP_KEY, id);
    else localStorage.removeItem(FOCUS_STEP_KEY);
  } catch {
    /* ignore */
  }
}

/** Live wall-clock that re-renders every second. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function GlobalTimerBar() {
  const { allSteps, activeTimerStepId } = useData();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const toggleCompletion = useToggleStepCompletion();
  const toast = useToast();

  // The step the bar is tracking. While a timer runs we adopt it; on pause the
  // timer stops accruing but the bar (and this id) stay so it can be resumed.
  const [focusId, setFocusId] = useState<string | null>(readFocusId);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (activeTimerStepId) {
      setFocusId(activeTimerStepId);
      writeFocusId(activeTimerStepId);
    }
  }, [activeTimerStepId]);

  const step = useMemo(
    () => (focusId ? allSteps?.find((s) => s._id === focusId) ?? null : null),
    [focusId, allSteps]
  );

  const isRunning = !!step && step.timerStartedAt != null;
  const elapsed = useElapsedTime(
    isRunning ? step?.timerStartedAt : undefined,
    step?.totalTimeSpentMs || 0
  );

  const clear = useCallback(() => {
    setFocusId(null);
    writeFocusId(null);
    setFullscreen(false);
  }, []);

  const handlePauseResume = useCallback(async () => {
    if (!step) return;
    try {
      if (isRunning) await stopTimer({ id: step._id });
      else await startTimer({ id: step._id });
    } catch (error) {
      reportError("mutation", error, { action: "timerPauseResume", stepId: step._id });
      toast.error("Failed to toggle timer");
    }
  }, [step, isRunning, startTimer, stopTimer, toast]);

  const handleStop = useCallback(async () => {
    if (!step) return;
    try {
      if (isRunning) await stopTimer({ id: step._id });
    } catch (error) {
      reportError("mutation", error, { action: "timerStop", stepId: step._id });
      toast.error("Failed to stop timer");
    }
    clear();
  }, [step, isRunning, stopTimer, toast, clear]);

  const handleStopComplete = useCallback(async () => {
    if (!step) return;
    try {
      if (isRunning) await stopTimer({ id: step._id });
      await toggleCompletion({ id: step._id });
      toast.success("Step completed");
    } catch (error) {
      reportError("mutation", error, { action: "timerStopComplete", stepId: step._id });
      toast.error("Failed to complete step");
    }
    clear();
  }, [step, isRunning, stopTimer, toggleCompletion, toast, clear]);

  // Esc exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  if (!step) return null;

  const controls = (size: "sm" | "lg") => {
    const btnClass =
      size === "lg"
        ? "flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition-colors"
        : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors";
    const iconSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";
    return (
      <div className={size === "lg" ? "flex items-center gap-3" : "flex items-center gap-1"}>
        <button
          onClick={handlePauseResume}
          className={`${btnClass} text-foreground hover:bg-muted`}
          aria-label={isRunning ? "Pause timer" : "Resume timer"}
        >
          {isRunning ? <Pause className={iconSize} /> : <Play className={iconSize} />}
          {size === "lg" && <span>{isRunning ? "Pause" : "Resume"}</span>}
        </button>
        <button
          onClick={handleStop}
          className={`${btnClass} text-muted-foreground hover:bg-muted hover:text-foreground`}
          aria-label="Stop timer"
        >
          <Square className={`${iconSize} fill-current`} />
          {size === "lg" && <span>Stop</span>}
        </button>
        <button
          onClick={handleStopComplete}
          className={`${btnClass} text-accent hover:bg-accent-light`}
          aria-label="Stop and complete step"
        >
          <CheckCircle2 className={iconSize} />
          {size === "lg" ? <span>Stop &amp; complete</span> : null}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Compact central bar, fixed at the top across every page */}
      <div className="fixed top-3 left-1/2 z-40 -translate-x-1/2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur">
          <Timer className={`w-4 h-4 ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <span className="max-w-[180px] truncate text-sm font-medium text-foreground">
            {step.title}
          </span>
          <span className="font-mono text-sm tabular-nums text-primary">{elapsed}</span>
          <div className="mx-1 h-4 w-px bg-border" />
          {controls("sm")}
          <IconButton
            icon={<Maximize2 className="w-4 h-4 text-muted-foreground" />}
            aria-label="Open focus mode"
            variant="ghost"
            size="icon-sm"
            onClick={() => setFullscreen(true)}
          />
        </div>
      </div>

      {fullscreen && <FocusMode step={step} elapsed={elapsed} isRunning={isRunning} controls={controls("lg")} onExit={() => setFullscreen(false)} />}
    </>
  );
}

function FocusMode({
  step,
  elapsed,
  isRunning,
  controls,
  onExit,
}: {
  step: Step;
  elapsed: string;
  isRunning: boolean;
  controls: React.ReactNode;
  onExit: () => void;
}) {
  const now = useNow();
  const clock = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Top bar: wall clock + exit */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <div className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{clock}</span>
          <span className="mx-2">·</span>
          <span>{date}</span>
        </div>
        <IconButton
          icon={<X className="w-5 h-5" />}
          aria-label="Exit focus mode"
          variant="ghost"
          size="icon-sm"
          onClick={onExit}
        />
      </div>

      {/* Center: step + big timer */}
      <div className="flex flex-col items-center gap-6 text-center px-6">
        {step.path?.title && (
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            {step.path.title}
          </span>
        )}
        <h1 className="max-w-2xl text-3xl font-semibold text-foreground">{step.title}</h1>
        <div
          className={`font-mono text-7xl font-bold tabular-nums sm:text-8xl ${
            isRunning ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {elapsed}
        </div>
        <div className="mt-2">{controls}</div>
      </div>
    </div>,
    document.body
  );
}
