import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Timer,
  Pause,
  Play,
  Square,
  CheckCircle2,
  Maximize2,
  X,
  Minus,
  EyeOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import {
  useStartTimer,
  useStopTimer,
  useToggleStepCompletion,
  TIMER_STARTED_EVENT,
} from "@/lib/local-mutations";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { useElapsedTime } from "@/hooks/useTimer";
import {
  getOpenFocusOnPlay,
  setTimerBarHidden,
  useTimerBarHidden,
  setFocusVolume,
  useFocusVolume,
  useFocusAudioOn,
  setFocusAudioOn,
  useFocusBackground,
  useFocusTrack,
} from "@/lib/preferences";
import { FOCUS_IMAGE_SCRIM, focusBackgroundCss } from "@/lib/focus-background";
import { useFocusMedia } from "@/lib/focus-media";
import {
  CUSTOM_TRACK_ID,
  TRACK_ARTIST,
  findBundledTrack,
  shouldPlayFocusAudio,
} from "@/lib/focus-tracks";
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
  const { allSteps, runningTimerStepIds } = useData();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const toggleCompletion = useToggleStepCompletion();
  const toast = useToast();

  // The step the bar is tracking. While a timer runs we adopt it; on pause the
  // timer stops accruing but the bar (and this id) stay so it can be resumed.
  const [focusId, setFocusId] = useState<string | null>(readFocusId);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hidden = useTimerBarHidden();

  // Every running step, newest first. The bar puts one in front and keeps the
  // rest one click away rather than stacking live clocks on top of the app.
  const runningSteps = useMemo(
    () =>
      runningTimerStepIds
        .map((id) => allSteps?.find((s) => s._id === id))
        .filter((s): s is Step => !!s),
    [runningTimerStepIds, allSteps]
  );
  const newestRunningId = runningTimerStepIds[0] ?? null;

  // Adopt the most recently started timer. Keyed on the newest id rather than
  // the whole set, so switching by hand sticks: starting another timer moves
  // the bar, stopping one falls back to the next newest, and nothing else
  // overrides a deliberate choice.
  useEffect(() => {
    if (newestRunningId) {
      setFocusId(newestRunningId);
      writeFocusId(newestRunningId);
    }
  }, [newestRunningId]);

  // Open focus mode on a user-initiated timer start (play / resume) when the
  // pref is on. Event-driven so a page reload with a running timer does not
  // force fullscreen. Read the pref live so toggling it takes effect next play.
  useEffect(() => {
    const handler = () => {
      if (getOpenFocusOnPlay()) setFullscreen(true);
    };
    window.addEventListener(TIMER_STARTED_EVENT, handler);
    return () => window.removeEventListener(TIMER_STARTED_EVENT, handler);
  }, []);

  const step = useMemo(
    () => (focusId ? (allSteps?.find((s) => s._id === focusId) ?? null) : null),
    [focusId, allSteps]
  );

  const isRunning = !!step && step.timerStartedAt != null;
  const elapsed = useElapsedTime(
    isRunning ? step?.timerStartedAt : undefined,
    step?.totalTimeSpentMs || 0
  );

  // Focus audio is owned here, not by FocusMode, because FocusMode unmounts the
  // moment you leave fullscreen and an unmounted <audio> stops playing. The bar
  // is mounted for as long as there is a timer at all, so the track survives
  // exiting fullscreen and keeps playing while the work does.
  const audioOn = useFocusAudioOn();
  const volume = useFocusVolume();
  const trackId = useFocusTrack();
  const { url: customAudioUrl } = useFocusMedia("audio");
  const bundledTrack = findBundledTrack(trackId);
  // A bundled track plays from public/; "custom" plays the user's own file.
  const audioUrl = trackId === CUSTOM_TRACK_ID ? customAudioUrl : (bundledTrack?.src ?? null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioShouldPlay = shouldPlayFocusAudio({
    audioOn,
    hasTrack: !!audioUrl,
    fullscreen,
    timerRunning: isRunning,
  });

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    if (audioShouldPlay) {
      // Autoplay can still be refused; starting a timer or opening focus mode
      // is a user gesture, but never let a rejected promise surface as an
      // unhandled rejection.
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [audioShouldPlay, volume, audioUrl]);

  // Surface the running timer in the tab title so a backgrounded PWA tab still
  // shows it (there's no service-worker notification channel).
  const otherRunningCount = runningSteps.filter((s) => s._id !== focusId).length;

  useEffect(() => {
    if (!isRunning) return;
    const base = "VoidSteps";
    const extra = otherRunningCount > 0 ? ` +${otherRunningCount}` : "";
    document.title = `▶ ${elapsed}${extra} · ${base}`;
    return () => {
      document.title = base;
    };
  }, [isRunning, elapsed, otherRunningCount]);

  // Move the bar to the next running timer, oldest-to-newest and wrapping.
  const switchToNext = useCallback(() => {
    if (runningSteps.length < 2) return;
    const index = runningSteps.findIndex((s) => s._id === focusId);
    const next = runningSteps[(index + 1) % runningSteps.length];
    if (!next) return;
    setFocusId(next._id);
    writeFocusId(next._id);
  }, [runningSteps, focusId]);

  const hide = useCallback(() => {
    setTimerBarHidden(true);
    setFullscreen(false);
    toast.success("Timer bar hidden. Bring it back in Settings, under Focus.");
  }, [toast]);

  // After the tracked timer stops, hand the bar (and focus mode, if open) to the
  // newest timer still running. Only when none are left does it go away. The
  // newest-id effect cannot do this alone: stopping an older timer leaves the
  // newest id unchanged, so nothing would re-adopt one.
  const moveOnFrom = useCallback(
    (stoppedId: string) => {
      const next = runningSteps.find((s) => s._id !== stoppedId);
      if (next) {
        setFocusId(next._id);
        writeFocusId(next._id);
        return;
      }
      setFocusId(null);
      writeFocusId(null);
      setFullscreen(false);
    },
    [runningSteps]
  );

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
    moveOnFrom(step._id);
  }, [step, isRunning, stopTimer, toast, moveOnFrom]);

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
    moveOnFrom(step._id);
  }, [step, isRunning, stopTimer, toggleCompletion, toast, moveOnFrom]);

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
        ? "flex items-center gap-2 rounded-lg px-5 py-2.5 type-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 type-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
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
          className={`${btnClass} text-accent-ink hover:bg-accent-light`}
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
      {/* Rendered here rather than inside FocusMode so leaving fullscreen does
          not unmount it mid-track. */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} loop />}

      {/* Compact running-timer bar. Bottom-center on mobile (clears the header /
          menu button), top-center on md+. Hidden removes the bar and the focus
          view, never the timers: they keep running, keep their music, and stay
          visible on the step cards themselves. */}
      <div
        hidden={hidden}
        className="fixed z-40 bottom-4 left-4 right-20 flex justify-start pointer-events-none md:left-1/2 md:right-auto md:bottom-auto md:top-3 md:-translate-x-1/2 md:justify-center"
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand timer"
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-popover px-3 py-1.5 shadow-elev-3"
          >
            <Timer
              className={`w-4 h-4 shrink-0 ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`}
            />
            <span className="font-mono type-body tabular-nums text-primary">{elapsed}</span>
            {otherRunningCount > 0 && (
              <span className="font-mono type-meta tabular-nums text-muted-foreground">
                +{otherRunningCount}
              </span>
            )}
          </button>
        ) : (
          <div className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-xl bg-popover px-2 py-1 shadow-elev-3 md:gap-2 md:px-3 md:py-1.5">
            <Timer
              className={`w-4 h-4 shrink-0 ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`}
            />
            <span className="min-w-0 max-w-[90px] truncate type-title text-foreground sm:max-w-[180px]">
              {step.title}
            </span>
            <span className="shrink-0 font-mono type-body tabular-nums text-primary">
              {elapsed}
            </span>
            {otherRunningCount > 0 && (
              <button
                type="button"
                onClick={switchToNext}
                title={`${otherRunningCount} more running. Click to switch.`}
                aria-label="Switch to the next running timer"
                className="shrink-0 rounded-full bg-field px-1.5 py-0.5 font-mono type-meta tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                +{otherRunningCount}
              </button>
            )}
            {controls("sm")}
            <IconButton
              icon={<Maximize2 className="w-4 h-4 text-muted-foreground" />}
              aria-label="Open focus mode"
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen(true)}
            />
            <IconButton
              icon={<Minus className="w-4 h-4 text-muted-foreground" />}
              aria-label="Collapse timer"
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed(true)}
            />
            <IconButton
              icon={<EyeOff className="w-4 h-4 text-muted-foreground" />}
              aria-label="Hide the timer bar"
              variant="ghost"
              size="icon-sm"
              onClick={hide}
            />
          </div>
        )}
      </div>

      {fullscreen && !hidden && (
        <FocusMode
          step={step}
          elapsed={elapsed}
          isRunning={isRunning}
          controls={controls("lg")}
          runningSteps={runningSteps}
          onSwitch={(id) => {
            setFocusId(id);
            writeFocusId(id);
          }}
          onExit={() => setFullscreen(false)}
        />
      )}
    </>
  );
}

/** One other running timer, as a switchable chip under the main clock. Its own
 * component because each needs its own live elapsed tick. */
function RunningChip({ step, onSelect }: { step: Step; onSelect: () => void }) {
  const elapsed = useElapsedTime(step.timerStartedAt, step.totalTimeSpentMs || 0);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-2 rounded-full bg-field px-3 py-1.5 type-body text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span className="max-w-[12rem] truncate">{step.title}</span>
      <span className="font-mono tabular-nums text-primary">{elapsed}</span>
    </button>
  );
}

function FocusMode({
  step,
  elapsed,
  isRunning,
  controls,
  runningSteps,
  onSwitch,
  onExit,
}: {
  step: Step;
  elapsed: string;
  isRunning: boolean;
  controls: React.ReactNode;
  runningSteps: Step[];
  onSwitch: (id: string) => void;
  onExit: () => void;
}) {
  const now = useNow();
  const clock = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const backgroundId = useFocusBackground();
  const { url: wallpaperUrl } = useFocusMedia("wallpaper");
  const { url: customAudioUrl } = useFocusMedia("audio");
  const trackId = useFocusTrack();
  const bundled = findBundledTrack(trackId);
  // A bundled track plays from public/; "custom" plays the user's own file.
  const audioUrl = trackId === CUSTOM_TRACK_ID ? customAudioUrl : (bundled?.src ?? null);
  const nowPlaying = trackId === CUSTOM_TRACK_ID ? null : (bundled?.title ?? null);
  const audioOn = useFocusAudioOn();
  // These controls only read and write the shared preference. The <audio>
  // element they drive belongs to GlobalTimerBar, so that leaving fullscreen
  // does not stop the track.
  const volume = useFocusVolume();
  const others = runningSteps.filter((s) => s._id !== step._id);

  // A picked image wins over a generated background; the scrim keeps the timer
  // readable over a bright photo without assuming the theme is dark.
  const useImage = backgroundId === "custom" && wallpaperUrl;
  const backgroundImage = useImage
    ? `${FOCUS_IMAGE_SCRIM}, url("${wallpaperUrl}")`
    : focusBackgroundCss(backgroundId);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background bg-cover bg-center"
      style={{ backgroundImage }}
    >
      {/* Top bar: wall clock + exit */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <div className="type-body text-muted-foreground">
          <span className="font-mono text-foreground">{clock}</span>
          <span className="mx-2">·</span>
          <span>{date}</span>
          {audioOn && nowPlaying && (
            <>
              <span className="mx-2">·</span>
              {/* CC0 asks for nothing. Crediting him costs a line. */}
              <span>
                {nowPlaying} <span className="opacity-70">by {TRACK_ARTIST}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {audioUrl && (
            <>
              <IconButton
                icon={audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                aria-label={audioOn ? "Mute audio" : "Play audio"}
                variant="ghost"
                size="icon-sm"
                onClick={() => setFocusAudioOn(!audioOn)}
              />
              {audioOn && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  aria-label="Volume"
                  className="w-20 accent-primary"
                  onChange={(e) => {
                    setFocusVolume(Number(e.target.value));
                  }}
                />
              )}
            </>
          )}
          <IconButton
            icon={<X className="w-5 h-5" />}
            aria-label="Exit focus mode"
            variant="ghost"
            size="icon-sm"
            onClick={onExit}
          />
        </div>
      </div>

      {/* Center: step + big timer */}
      <div className="flex flex-col items-center gap-6 text-center px-6">
        {step.path?.title && (
          <span className="rounded-full bg-field px-3 py-1 type-meta text-muted-foreground">
            {step.path.title}
          </span>
        )}
        <h1 className="max-w-2xl type-focus text-foreground">{step.title}</h1>
        <div
          className={`font-mono type-display ${
            isRunning ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {elapsed}
        </div>
        <div className="mt-2">{controls}</div>

        {/* The other timers still running behind this one. Focus mode is about
            one thing at a time, so they stay small and out of the way, but
            hiding them entirely would make focus mode the one place in the app
            that lies about what is running. */}
        {others.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="type-overline text-muted-foreground/70">Also running</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {others.map((other) => (
                <RunningChip key={other._id} step={other} onSelect={() => onSwitch(other._id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
