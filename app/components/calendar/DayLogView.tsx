import { useClock } from "@/hooks/useClock";
import { useCallback, useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useUpdateStep } from "@/lib/local-mutations";
import { reportError } from "@/lib/error-store";
import { useDayTimeEntries } from "@/hooks/useTimesheet";
import {
  buildDayIntervals,
  summarizeDay,
  unionCoverageMs,
  assignColorSlots,
  layoutDayBlocks,
  dayGridHours,
  formatClock,
  type DayBlock,
  type DayInterval,
  type StepForTimeline,
} from "@/lib/timesheet-utils";
import { formatDurationHM } from "@/lib/analytics-utils";
import { getStartOfDay } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StepDialog, type StepDialogTab } from "@/components/StepDialog";
import { ChevronLeft, ChevronRight, Hourglass, Target } from "lucide-react";
import type { Step } from "@/types";

// Validated categorical palette (dataviz reference instance): fixed slot order
// chosen for worst-adjacent-pair CVD separation - never cycled, never extended.
// Two selected modes; the dark column is the same hues re-stepped for dark
// surfaces. Identity is never color-alone: every segment also appears in the
// legend and timeline with its name.
const SERIES_LIGHT = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
  "#eb6834",
];
const SERIES_DARK = [
  "#3987e5",
  "#199e70",
  "#c98500",
  "#008300",
  "#9085e9",
  "#e66767",
  "#d55181",
  "#d95926",
];
const OTHER_COLOR = "#898781"; // muted - the fold-in bucket, both modes

const HOUR_MS = 60 * 60 * 1000;
// Grid scale. A block is never drawn shorter than MIN_BLOCK_PX, so a short
// session stays readable and clickable; the layout reserves that height too.
const HOUR_PX = 72;
const MIN_BLOCK_PX = 20;
// Below this a block has room for one line only.
const TWO_LINE_PX = 40;

/** Pick the palette mode from the active theme's background lightness (themes
 * are user-defined HSL, so "dark mode" is a property of the theme, not the OS). */
function useSeriesColors(): string[] {
  const { theme } = useTheme();
  return useMemo(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    const match = bg.match(/([\d.]+)%\s*$/);
    const lightness = match ? parseFloat(match[1]) : 100;
    return lightness < 50 ? SERIES_DARK : SERIES_LIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

interface DayLogViewProps {
  viewDate: Date;
  onNavigate: (date: Date) => void;
}

export default function DayLogView({ viewDate, onNavigate }: DayLogViewProps) {
  const { allSteps, activePaths, runningTimerStepIds } = useData();
  const seriesColors = useSeriesColors();
  const toast = useToast();
  const updateStepMutation = useUpdateStep();

  const handleSaveEdit = useCallback(
    async (id: string, updates: Partial<Step>) => {
      try {
        const { path: _path, ...cleanUpdates } = updates as Record<string, unknown>;
        await updateStepMutation({ id, ...cleanUpdates });
      } catch (e) {
        reportError("mutation", e, { action: "updateStep", stepId: id });
        toast.error("Failed to update step");
      }
    },
    [updateStepMutation, toast]
  );

  const dayStart = getStartOfDay(viewDate);
  const todayStart = getStartOfDay(new Date());
  const isToday = dayStart === todayStart;

  const entries = useDayTimeEntries(dayStart);

  const stepsById = useMemo(() => {
    const map = new Map<string, StepForTimeline>();
    for (const s of allSteps ?? []) {
      map.set(s._id, {
        _id: s._id,
        title: s.title,
        pathTitle: s.path?.title,
        timerStartedAt: s.timerStartedAt,
      });
    }
    return map;
  }, [allSteps]);

  const runningSteps = useMemo(
    () => runningTimerStepIds.map((id) => stepsById.get(id)).filter((s) => s !== undefined),
    [runningTimerStepIds, stepsById]
  );
  // Live-tick only while a session is running on the viewed day (today).
  const now = useClock(runningSteps.length > 0 && isToday ? 1000 : 60000);

  const intervals = useMemo(
    () =>
      entries ? buildDayIntervals(entries, stepsById, runningSteps, dayStart, now) : undefined,
    [entries, stepsById, runningSteps, dayStart, now]
  );

  const segments = useMemo(() => (intervals ? summarizeDay(intervals) : []), [intervals]);
  const colorSlots = useMemo(
    () => (intervals ? assignColorSlots(intervals) : new Map<string, number>()),
    [intervals]
  );
  // Clamp, never cycle: a 9th+ task renders as the neutral fold-in color
  // everywhere, so no two distinct tasks can ever share a palette hue.
  const colorFor = (stepId: string, other?: boolean) => {
    const slot = colorSlots.get(stepId);
    return other || slot === undefined || slot >= seriesColors.length
      ? OTHER_COLOR
      : seriesColors[slot];
  };

  // Two different questions, and with parallel timers they stop agreeing:
  // totalMs is effort (sessions summed, a day can exceed 24h), coveredMs is
  // how much of the day was spent working at all (overlaps merged).
  const totalMs = useMemo(
    () => (intervals ?? []).reduce((sum, iv) => sum + iv.durationMs, 0),
    [intervals]
  );
  const coveredMs = useMemo(() => unionCoverageMs(intervals ?? []), [intervals]);
  const hasOverlap = coveredMs > 0 && totalMs - coveredMs > 60_000;
  const taskCount =
    segments.filter((s) => !s.other).length + (segments.some((s) => s.other) ? 1 : 0);

  const [openStep, setOpenStep] = useState<{ stepId: string; tab: StepDialogTab } | null>(null);
  // Resolve the dialog's step from live data so it tracks edits/timer changes.
  const dialogStep = openStep
    ? ((allSteps ?? []).find((s) => s._id === openStep.stepId) ?? null)
    : null;
  const openActivity = (stepId: string) => {
    if (stepsById.has(stepId)) setOpenStep({ stepId, tab: "activity" });
  };

  const shiftDay = (delta: number) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    onNavigate(d);
  };

  const dayLabel = new Date(dayStart).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (!intervals) return null;

  const first = intervals[0];
  // The furthest the day reached, which is not the last row: intervals sort by
  // start, and with parallel timers a session begun earlier can end later.
  const last = intervals.reduce((a, b) => (b.end > a.end ? b : a), intervals[0]);

  return (
    <div className="space-y-4">
      {/* Day navigation + headline */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftDay(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold">
            {isToday ? `Today · ${dayLabel}` : dayLabel}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftDay(1)}
            aria-label="Next day"
            disabled={isToday}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => onNavigate(new Date())}>
              Today
            </Button>
          )}
        </div>
        {intervals.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Tracked <span className="font-medium text-foreground">{formatDurationHM(totalMs)}</span>
            {hasOverlap && (
              <span title="Timers that ran at the same time are counted once here">
                {" across "}
                <span className="font-medium text-foreground">{formatDurationHM(coveredMs)}</span>
              </span>
            )}
            {" · "}
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
            {" · "}
            {formatClock(first.start)} to {last.running ? "now" : formatClock(last.end)}
          </p>
        )}
      </div>

      {intervals.length === 0 ? (
        <EmptyState
          icon={Hourglass}
          message={`Nothing tracked ${isToday ? "today" : `on ${dayLabel}`}`}
          hint="Press play on any step to start tracking time"
        />
      ) : (
        <>
          {/* Proportional summary strip + legend */}
          <div className="space-y-2">
            <div
              className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
              role="img"
              aria-label="Share of tracked time by task"
            >
              {segments.map((seg) => (
                <div
                  key={seg.stepId}
                  className="h-full rounded-[2px] first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.max((seg.totalMs / totalMs) * 100, 1)}%`,
                    backgroundColor: colorFor(seg.stepId, seg.other),
                  }}
                  title={`${seg.title} · ${formatDurationHM(seg.totalMs)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {segments.map((seg) => (
                <button
                  key={seg.stepId}
                  type="button"
                  disabled={seg.other || seg.deletedStep}
                  onClick={() => openActivity(seg.stepId)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground enabled:hover:text-foreground transition-colors"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorFor(seg.stepId, seg.other) }}
                  />
                  <span className="max-w-[14rem] truncate">
                    {seg.title}
                    {seg.deletedStep ? " (deleted)" : ""}
                  </span>
                  <span className="font-mono tabular-nums">{formatDurationHM(seg.totalMs)}</span>
                </button>
              ))}
            </div>
          </div>

          <DayGrid
            intervals={intervals}
            dayStart={dayStart}
            now={isToday ? now : null}
            colorFor={colorFor}
            onOpen={openActivity}
          />
        </>
      )}

      {openStep && dialogStep && (
        <StepDialog
          step={dialogStep}
          paths={activePaths ?? []}
          open
          initialTab={openStep.tab}
          onOpenChange={(open) => !open && setOpenStep(null)}
          onSaveEdit={handleSaveEdit}
        />
      )}
    </div>
  );
}

/** The day as a calendar column: an hour scale on the left, each session a
 * block as tall as it ran, and sessions that overlapped side by side. Empty
 * space between blocks is the untracked time. */
function DayGrid({
  intervals,
  dayStart,
  now,
  colorFor,
  onOpen,
}: {
  intervals: DayInterval[];
  dayStart: number;
  /** Set on today only, to draw the current-time line. */
  now: number | null;
  colorFor: (stepId: string) => string;
  onOpen: (stepId: string) => void;
}) {
  const { startHour, endHour } = dayGridHours(intervals, dayStart);
  // Positions come from real timestamps of local hours, so a DST day's missing
  // or repeated hour lands where the clock says it does.
  const hourTs = (h: number) => new Date(dayStart).setHours(h, 0, 0, 0);
  const gridStart = hourTs(startHour);
  const gridEnd = hourTs(endHour);
  const y = (ts: number) => ((ts - gridStart) / HOUR_MS) * HOUR_PX;

  const blocks = useMemo(
    () => layoutDayBlocks(intervals, (MIN_BLOCK_PX / HOUR_PX) * HOUR_MS),
    [intervals]
  );
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => hourTs(startHour + i));

  return (
    <div className="rounded-lg border border-border bg-card px-2 py-4 sm:px-3">
      <div className="relative" style={{ height: y(gridEnd) }}>
        {hours.map((ts) => (
          <div key={ts} className="absolute inset-x-0" style={{ top: y(ts) }}>
            <span className="absolute left-0 w-12 -translate-y-1/2 pr-2 text-right text-[11px] tabular-nums text-muted-foreground/70">
              {new Date(ts).toLocaleTimeString(undefined, { hour: "numeric" })}
            </span>
            <span className="absolute left-12 right-0 h-px bg-border/60" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-12 right-0 ml-1">
          {blocks.map((block) => (
            <DayBlockButton
              key={block.interval.entryId ?? `running-${block.interval.stepId}`}
              block={block}
              top={y(block.interval.start)}
              height={Math.max(y(block.interval.end) - y(block.interval.start), MIN_BLOCK_PX)}
              color={colorFor(block.interval.stepId)}
              onOpen={() => !block.interval.deletedStep && onOpen(block.interval.stepId)}
            />
          ))}

          {now != null && now >= gridStart && now <= gridEnd && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: y(now) }}
              aria-hidden
            >
              <span className="-ml-1 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
              <span className="h-0.5 flex-1 -translate-y-1/2 bg-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayBlockButton({
  block,
  top,
  height,
  color,
  onOpen,
}: {
  block: DayBlock;
  top: number;
  height: number;
  color: string;
  onOpen: () => void;
}) {
  const { interval, lane, span, lanes } = block;
  const from = interval.clippedStart ? "0:00" : formatClock(interval.start);
  const to = interval.running ? "now" : formatClock(interval.end);
  const duration = formatDurationHM(interval.durationMs);
  const title = `${interval.title}${interval.deletedStep ? " (deleted)" : ""}`;
  const compact = height < TWO_LINE_PX;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={interval.deletedStep}
      title={`${title} · ${from} to ${to} · ${duration}`}
      aria-label={`${title}, ${from} to ${to}, ${duration}${interval.running ? ", running" : ""}`}
      className={`absolute flex overflow-hidden rounded-md border-l-[3px] px-2 text-left transition-[filter] enabled:hover:brightness-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        compact ? "items-center gap-1.5" : "flex-col gap-0.5 py-1"
      } ${interval.deletedStep ? "opacity-60" : ""}`}
      style={{
        top,
        height,
        // A hairline gutter between neighbours; the last column runs flush.
        left: `${(lane / lanes) * 100}%`,
        width: `calc(${(span / lanes) * 100}% - 2px)`,
        borderLeftColor: color,
        // The palette is all #rrggbb, so an alpha suffix tints the fill.
        backgroundColor: `${color}2e`,
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {interval.running && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: color }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          </span>
        )}
        <span
          className={`truncate text-xs font-medium ${interval.deletedStep ? "text-muted-foreground line-through" : "text-foreground"}`}
        >
          {title}
        </span>
      </span>
      {compact ? (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {duration}
        </span>
      ) : (
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums">
            {from} to {to} · {duration}
          </span>
          {interval.clippedStart && <span>from previous day</span>}
          {interval.pathTitle && (
            <Badge variant="secondary" size="sm" icon={<Target className="w-2.5 h-2.5" />}>
              {interval.pathTitle}
            </Badge>
          )}
          {interval.source === "manual" && <span className="uppercase tracking-wide">manual</span>}
        </span>
      )}
    </button>
  );
}
