import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { useStopTimer, useStopTimerAt, useDiscardTimer } from "@/lib/local-mutations";
import { reportError } from "@/lib/error-store";
import { formatDurationHM } from "@/lib/analytics-utils";
import { toDateTimeLocal, fromDateTimeLocal } from "@/lib/timesheet-utils";
import { formatAbsoluteDateTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

/** A session older than this is presumed forgotten and prompts a reconcile. */
const STALE_TIMER_MS = 8 * 60 * 60 * 1000;

// Once per JS session per step: Layout remounts on every route change, so
// without this a dismissed prompt would reappear on each navigation.
const promptedStepIds = new Set<string>();

/**
 * Two timer safety nets, mounted globally in Layout:
 *
 * 1. Forgotten timer: a running session older than 8h (overnight laptop-lid
 *    case) prompts Keep / Trim to... / Discard instead of silently polluting
 *    the Day Log with a 14h block. Never auto-stops in the background.
 * 2. Convergence: two devices that both started timers offline sync into >1
 *    running step. The newest start wins; older ones are stopped AT the
 *    newer's start instant - deterministic, so every device converges to the
 *    same entries.
 */
export default function TimerReconcileGuard() {
  const { allSteps } = useData();
  const toast = useToast();
  const stopTimer = useStopTimer();
  const stopTimerAt = useStopTimerAt();
  const discardTimer = useDiscardTimer();

  const runningSteps = useMemo(
    () => (allSteps ?? []).filter((s) => s.timerStartedAt != null && !s.archived),
    [allSteps]
  );

  // The staleness check needs a clock: without a tick, a session crossing the
  // 8h threshold while the app sits open (or a laptop lid re-opens) would only
  // be noticed on the next incidental re-render.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  // Dismissals land in the module Set (survives Layout's per-route remounts),
  // but the Set isn't reactive - this tick forces the recompute that closes
  // the dialog.
  const [dismissTick, setDismissTick] = useState(0);

  // --- 2. Multi-running convergence (after a pull merges remote starts) ---
  const converging = useRef(false);
  useEffect(() => {
    if (runningSteps.length <= 1 || converging.current) return;
    converging.current = true;
    (async () => {
      try {
        const newest = runningSteps.reduce((a, b) =>
          (a.timerStartedAt ?? 0) >= (b.timerStartedAt ?? 0) ? a : b
        );
        for (const step of runningSteps) {
          if (step._id === newest._id) continue;
          // End the older session where the newer one began. If it started
          // after (clock skew), useStopTimerAt clamps to zero duration.
          await stopTimerAt({ id: step._id, end: newest.timerStartedAt! });
        }
      } catch (e) {
        reportError("mutation", e, { action: "timerConvergence" });
      } finally {
        converging.current = false;
      }
    })();
  }, [runningSteps, stopTimerAt]);

  // --- 1. Forgotten-timer reconcile ---
  const staleStep = useMemo(
    () =>
      runningSteps.find(
        (s) => clock - (s.timerStartedAt ?? 0) > STALE_TIMER_MS && !promptedStepIds.has(s._id)
      ) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runningSteps, clock, dismissTick]
  );

  const [trimValue, setTrimValue] = useState("");
  const [trimming, setTrimming] = useState(false);

  useEffect(() => {
    if (!staleStep) return;
    setTrimming(false);
    // Sensible trim default: one hour after the session started.
    setTrimValue(toDateTimeLocal((staleStep.timerStartedAt ?? Date.now()) + 60 * 60 * 1000));
  }, [staleStep?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!staleStep || runningSteps.length > 1) return null;

  const startedAt = staleStep.timerStartedAt!;
  const elapsedMs = clock - startedAt;
  const dismiss = () => {
    promptedStepIds.add(staleStep._id);
    setDismissTick((t) => t + 1);
  };

  const run = async (fn: () => Promise<void>, label: string) => {
    dismiss();
    try {
      await fn();
    } catch (e) {
      reportError("mutation", e, { action: label, stepId: staleStep._id });
      toast.error("Failed to update timer");
    }
  };

  const trimEnd = fromDateTimeLocal(trimValue);
  const trimValid = trimEnd !== undefined && trimEnd > startedAt && trimEnd <= Date.now();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Timer still running</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">“{staleStep.title}”</span> has been timing for{" "}
            <span className="font-medium text-foreground">{formatDurationHM(elapsedMs)}</span>, since{" "}
            {formatAbsoluteDateTime(startedAt)}. Keep all of it, trim it, or discard it?
          </DialogDescription>
        </DialogHeader>

        {trimming && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block">Worked until</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={trimValue}
              onChange={(e) => setTrimValue(e.target.value)}
            />
            {!trimValid && (
              <p className="text-xs text-destructive">Pick a time between the start and now</p>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap">
          <Button
            variant="outline"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={() => run(() => discardTimer({ id: staleStep._id }), "timerDiscard")}
          >
            Discard
          </Button>
          {trimming ? (
            <Button
              disabled={!trimValid}
              onClick={() => run(() => stopTimerAt({ id: staleStep._id, end: trimEnd! }), "timerTrim")}
            >
              Trim &amp; stop
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setTrimming(true)}>
              Trim to…
            </Button>
          )}
          <Button onClick={() => run(() => stopTimer({ id: staleStep._id }), "timerKeep")}>
            Keep {formatDurationHM(elapsedMs)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
