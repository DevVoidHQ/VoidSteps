import { useEffect, useMemo, useState } from "react";
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
 * Forgotten-timer safety net, mounted globally in Layout: a running session
 * older than 8h (overnight laptop-lid case) prompts Keep / Trim to... /
 * Discard instead of silently polluting the Day Log with a 14h block. Never
 * auto-stops in the background.
 *
 * There used to be a second net here, "convergence", which resolved >1 running
 * step by keeping the newest and stopping the others AT its start instant. It
 * was written for two devices whose offline timers merged on sync, and sync no
 * longer exists. What it did in a local-only app was invent time: stopping a
 * three-week-old timer at yesterday's start mints a three-week session and
 * adds it to totalTimeSpentMs, with no prompt, bypassing the 8h guard directly
 * below it.
 *
 * Several running steps is now the ordinary case rather than a corruption to
 * heal: timers run in parallel by design. So this prompts for stale ones one
 * at a time and leaves every other running timer alone.
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

  // Forgotten-timer reconcile.
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

  // The >1-running case used to be suppressed here so convergence could
  // resolve it silently. With convergence gone the prompt handles those too,
  // one step at a time, which is the only path that asks before writing.
  if (!staleStep) return null;

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Timer still running</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">“{staleStep.title}”</span> has been timing
            for <span className="font-medium text-foreground">{formatDurationHM(elapsedMs)}</span>,
            since {formatAbsoluteDateTime(startedAt)}. Keep all of it, trim it, or discard it?
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
              onClick={() =>
                run(() => stopTimerAt({ id: staleStep._id, end: trimEnd! }), "timerTrim")
              }
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
