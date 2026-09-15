import { useClock } from "@/hooks/useClock";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CheckCircle2, Clock, TrendingUp, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useData } from "@/contexts/DataContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Step } from "@/types";
import {
  type RangeKey,
  getEffectiveTimeMs,
  formatDurationHM,
  startOfDay,
  generateDayRange,
  formatDayLabel,
} from "@/lib/analytics-utils";

// ---------------------------------------------------------------------------
// Theme colour helper - re-resolves CSS variables when theme changes
// ---------------------------------------------------------------------------
function useChartColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const resolve = (v: string) => {
      const raw = style.getPropertyValue(v).trim();
      return raw ? `hsl(${raw})` : undefined;
    };
    return {
      primary: resolve("--primary") ?? "#083291",
      secondary: resolve("--accent") ?? "#c26579",
      accent: resolve("--accent") ?? "#c26579",
      destructive: resolve("--destructive") ?? "#ef4444",
      muted: resolve("--muted") ?? "#64748b",
      foreground: resolve("--foreground") ?? "#1a1a1a",
      mutedForeground: resolve("--muted-foreground") ?? "#6b6b6b",
    };
    // theme is the dependency that triggers re-computation when the user changes theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

const RANGE_DAYS: Record<RangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const TIME_BY_PATH_TOP_N = 8;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Analytics() {
  const now = useClock();
  const { allSteps, isLoading } = useData();
  const [selectedRange, setSelectedRange] = useState<RangeKey>("30d");
  const colors = useChartColors();

  // Solid, readable tooltip box. NOTE: only --background/--foreground/etc. exist
  // as CSS vars here - `--card`/`--border` do not, so referencing them yields a
  // transparent box (the old bug). Stick to the real variables.
  const tooltipStyle = {
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--foreground) / 0.12)",
    borderRadius: 8,
    boxShadow: "0 6px 20px hsl(var(--foreground) / 0.15)",
    padding: "8px 12px",
  } as const;

  // ---- Range cutoff -------------------------------------------------------
  const rangeCutoff = useMemo(() => {
    const days = RANGE_DAYS[selectedRange];
    return startOfDay(now) - (days - 1) * 24 * 60 * 60 * 1000;
  }, [selectedRange, now]);

  // ---- Filtered step sets -------------------------------------------------
  const completedInRange = useMemo(
    () => (allSteps ?? []).filter((s) => s.completed && toMs(s.completedAt) >= rangeCutoff),
    [allSteps, rangeCutoff]
  );

  const failedInRange = useMemo(
    () => (allSteps ?? []).filter((s) => s.failed && toMs(s.failedAt) >= rangeCutoff),
    [allSteps, rangeCutoff]
  );

  // ---- Stat cards ----------------------------------------------------------
  const totalTimeMs = useMemo(
    () => completedInRange.reduce((sum, s) => sum + getEffectiveTimeMs(s.totalTimeSpentMs), 0),
    [completedInRange]
  );

  const completionRate = useMemo(() => {
    const total = completedInRange.length + failedInRange.length;
    return total > 0 ? Math.round((completedInRange.length / total) * 100) : 0;
  }, [completedInRange, failedInRange]);

  // Streak always uses all-time data
  const currentStreak = useMemo(() => {
    const completed = (allSteps ?? []).filter((s) => s.completed && s.completedAt);
    const daySet = new Set(completed.map((s) => startOfDay(toMs(s.completedAt))));
    let streak = 0;
    let day = startOfDay(now);
    // If nothing completed today, start from yesterday
    if (!daySet.has(day)) {
      day -= 24 * 60 * 60 * 1000;
    }
    while (daySet.has(day)) {
      streak++;
      day -= 24 * 60 * 60 * 1000;
    }
    return streak;
  }, [allSteps, now]);

  // ---- Section 2: Completion trends ----------------------------------------
  const completionTrendData = useMemo(() => {
    const days = RANGE_DAYS[selectedRange];
    const range = generateDayRange(days);
    const counts = new Map<number, number>();
    range.forEach((d) => counts.set(d, 0));
    completedInRange.forEach((s) => {
      const d = startOfDay(toMs(s.completedAt));
      counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    return range.map((d) => ({
      day: formatDayLabel(d, selectedRange),
      completed: counts.get(d) ?? 0,
    }));
  }, [completedInRange, selectedRange]);

  // ---- Section 2b: Daily time spent ----------------------------------------
  const dailyTimeData = useMemo(() => {
    const days = RANGE_DAYS[selectedRange];
    const range = generateDayRange(days);
    const msMap = new Map<number, number>();
    range.forEach((d) => msMap.set(d, 0));
    completedInRange.forEach((s) => {
      const d = startOfDay(toMs(s.completedAt));
      msMap.set(d, (msMap.get(d) ?? 0) + getEffectiveTimeMs(s.totalTimeSpentMs));
    });
    return range.map((d) => ({
      day: formatDayLabel(d, selectedRange),
      hours: +((msMap.get(d) ?? 0) / 3_600_000).toFixed(2),
      ms: msMap.get(d) ?? 0,
    }));
  }, [completedInRange, selectedRange]);

  // ---- Section 3: Time tracking by path ------------------------------------
  const timeByPathData = useMemo(() => {
    const map = new Map<string, number>();
    completedInRange.forEach((s) => {
      const label = stepPathName(s);
      map.set(label, (map.get(label) ?? 0) + getEffectiveTimeMs(s.totalTimeSpentMs));
    });
    const sorted = [...map.entries()]
      .map(([name, ms]) => ({ name, ms }))
      .sort((a, b) => b.ms - a.ms);

    // Top-N grouping: if total items <= N+1, show all (avoids "Other (1)")
    let items: { name: string; ms: number }[];
    if (sorted.length <= TIME_BY_PATH_TOP_N + 1) {
      items = sorted;
    } else {
      const top = sorted.slice(0, TIME_BY_PATH_TOP_N);
      const rest = sorted.slice(TIME_BY_PATH_TOP_N);
      const otherMs = rest.reduce((sum, r) => sum + r.ms, 0);
      items = [...top, { name: `Other (${rest.length})`, ms: otherMs }];
    }

    const maxMs = items[0]?.ms ?? 1;
    return items.map((item) => ({
      ...item,
      percent: Math.round((item.ms / maxMs) * 100),
    }));
  }, [completedInRange]);

  // ---- Section 4: Path breakdown -------------------------------------------
  const pathBreakdown = useMemo(() => {
    const doneMap = new Map<string, number>();
    const totalMap = new Map<string, number>();
    (allSteps ?? []).forEach((s) => {
      if (
        toMs(s.completedAt) < rangeCutoff &&
        toMs(s.failedAt) < rangeCutoff &&
        toMs(s.createdAt) < rangeCutoff
      )
        return;
      const label = stepPathName(s);
      totalMap.set(label, (totalMap.get(label) ?? 0) + 1);
      if (s.completed && toMs(s.completedAt) >= rangeCutoff) {
        doneMap.set(label, (doneMap.get(label) ?? 0) + 1);
      }
    });
    return [...totalMap.entries()]
      .map(([name, total]) => {
        const done = doneMap.get(name) ?? 0;
        return { name, done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
      })
      .sort((a, b) => b.done - a.done);
  }, [allSteps, rangeCutoff]);

  // ---- Section: Time log ---------------------------------------------------
  const TIME_LOG_CAP = 50;
  const timeLogData = useMemo(() => {
    return [...completedInRange]
      .sort((a, b) => toMs(b.completedAt) - toMs(a.completedAt))
      .slice(0, TIME_LOG_CAP)
      .map((s) => {
        const tracked = !!(s.totalTimeSpentMs && s.totalTimeSpentMs > 0);
        return {
          title: s.title,
          path: stepPathName(s),
          timeMs: getEffectiveTimeMs(s.totalTimeSpentMs),
          tracked,
          completedAt: toMs(s.completedAt),
        };
      });
  }, [completedInRange]);

  // ---- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Tabs
          defaultValue="30d"
          value={selectedRange}
          onValueChange={(v) => setSelectedRange(v as RangeKey)}
        >
          <TabsList>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Section 1: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
          label="Completed"
          value={completedInRange.length}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-primary" />}
          label="Total Time"
          value={formatDurationHM(totalTimeMs)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          label="Completion Rate"
          value={`${completionRate}%`}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-primary" />}
          label="Current Streak"
          value={`${currentStreak}d`}
        />
      </div>

      {/* Empty State */}
      {completedInRange.length === 0 && failedInRange.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          message="No activity in this period"
          hint="Complete some steps to see your analytics"
        />
      )}

      {/* Section 2: Completion Trends */}
      <Section title="Completion trends">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + "33"} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: colors.mutedForeground }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: colors.mutedForeground }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--foreground) / 0.06)" }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.foreground, fontWeight: 600 }}
                itemStyle={{ color: colors.primary }}
              />
              <Bar dataKey="completed" fill={colors.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Section 2b: Daily Time Spent */}
      <Section title="Daily time spent" subtitle="Hours spent per day across all paths">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + "33"} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: colors.mutedForeground }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: colors.mutedForeground }}
                unit="h"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--foreground) / 0.06)" }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: colors.foreground, fontWeight: 600 }}
                itemStyle={{ color: colors.accent }}

                formatter={(_v: any, _n: any, props: any) => [
                  formatDurationHM(props.payload.ms),
                  "Time",
                ]}
              />
              <Bar dataKey="hours" fill={colors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Time Tracking by Path + Path Breakdown - side by side */}
      {(timeByPathData.length > 0 || pathBreakdown.length > 0) && (
        <div className="grid items-start gap-8 md:grid-cols-2">
          {timeByPathData.length > 0 && (
            <Section title="Time tracking by path" subtitle="Only time a timer actually recorded">
              <div className="space-y-2">
                {timeByPathData.map((row, i) => (
                  <div key={row.name} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-right text-muted-foreground text-xs shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium truncate min-w-0 flex-1">{row.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDurationHM(row.ms)}
                      </span>
                    </div>
                    <div className="ml-7 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${row.percent}%`,
                          opacity: 1 - (i / timeByPathData.length) * 0.6,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {pathBreakdown.length > 0 && (
            <Section title="Path breakdown">
              <div className="space-y-3">
                {pathBreakdown.map((row) => (
                  <div key={row.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate mr-4">{row.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {row.done}/{row.total}
                        <span className={`ml-2 font-medium ${rateColor(row.rate)}`}>
                          {row.rate}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${row.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Section: Time Log */}
      {timeLogData.length > 0 && (
        <Section title="Time log" subtitle="Individual completed tasks, most recent first">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Task</th>
                  <th className="pb-2 pr-4 font-medium">Path</th>
                  <th className="pb-2 pr-4 font-medium">Time Spent</th>
                  <th className="pb-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {timeLogData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 even:bg-muted/20">
                    <td className="py-2 pr-4 truncate max-w-[200px]">{row.title}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.path}</td>
                    <td className={`py-2 pr-4 ${row.tracked ? "" : "text-muted-foreground"}`}>
                      {row.tracked ? formatDurationHM(row.timeMs) : "Not tracked"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.completedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {completedInRange.length > TIME_LOG_CAP && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {TIME_LOG_CAP} of {completedInRange.length} completed tasks
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{String(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMs(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  if (!Number.isNaN(n)) return n;
  return new Date(value).getTime() || 0;
}

function stepPathName(step: Step): string {
  if (step.path) return step.path.title;
  if (step.pathId) return "Unknown Path";
  return "No path";
}

function rateColor(rate: number): string {
  if (rate >= 70) return "text-primary";
  if (rate < 40) return "text-destructive";
  return "";
}
