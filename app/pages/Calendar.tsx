import { useClock } from "@/hooks/useClock";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { Step } from "@/types";
import {
  useUpdateStep,
  useDeleteStep,
  useToggleStepCompletion,
  useToggleStepFailed,
  useStartTimer,
  useStopTimer,
  useSetTotalTime,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { HierarchicalPathSelector } from "@/components/HierarchicalPathSelector";
import { getDescendantPathIds } from "@/lib/path-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { addMonths, getMonthGrid, getStartOfDay } from "@/lib/calendar-utils";
import TodayView from "@/components/calendar/TodayView";
import MonthView from "@/components/calendar/MonthView";
import DayLogView from "@/components/calendar/DayLogView";
import DayDetailPanel from "@/components/calendar/DayDetailPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

type CalendarView = "today" | "daylog" | "month";

// Persist the active view + month so leaving and returning to this page restores
// where you were (the URL params drop when navigating away via the sidebar).
const VIEW_KEY = "voidsteps-today-view";
const DATE_KEY = "voidsteps-today-date";
// Shared with Steps/Today so a chosen path stays consistent across the app.
const PATH_FILTER_KEY = "voidsteps-path-filter";
const ALLOWED_VIEWS: CalendarView[] = ["today", "daylog", "month"];

function persistedView(): CalendarView | null {
  try {
    const v = localStorage.getItem(VIEW_KEY) as CalendarView | null;
    return v && ALLOWED_VIEWS.includes(v) ? v : null;
  } catch {
    return null;
  }
}
function persistedDate(): string | null {
  try {
    return localStorage.getItem(DATE_KEY);
  } catch {
    return null;
  }
}

export default function Calendar() {
  const now = useClock();
  const toast = useToast();
  const { allSteps, reminders, activePaths, runningTimerStepIds } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlView = searchParams.get("view") as CalendarView | null;
  const currentView: CalendarView =
    (urlView && ALLOWED_VIEWS.includes(urlView) ? urlView : null) || persistedView() || "today";
  const dateParam = searchParams.get("date") || persistedDate();
  // Parse the YYYY-MM-DD param as LOCAL midnight. A bare date-only string is
  // spec-defined as UTC midnight, which lands on the previous local day in
  // UTC-negative timezones and breaks day-granularity navigation (Day Log's
  // "next day" becomes a no-op, "prev" skips a day).
  const viewDate = useMemo(() => {
    const parsed = dateParam
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? `${dateParam}T00:00:00` : dateParam)
      : new Date(now);
    return Number.isNaN(parsed.getTime()) ? new Date(now) : parsed;
  }, [dateParam, now]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [selectedPathFilter, setSelectedPathFilter] = useState<string>(() => {
    try {
      return localStorage.getItem(PATH_FILTER_KEY) || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      if (selectedPathFilter) localStorage.setItem(PATH_FILTER_KEY, selectedPathFilter);
      else localStorage.removeItem(PATH_FILTER_KEY);
    } catch {
      /* ignore */
    }
  }, [selectedPathFilter]);

  // Mutations (needed for month/timeline day detail panel)
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const toggleStepMutation = useToggleStepCompletion();
  const toggleFailedMutation = useToggleStepFailed();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const setTotalTimeMutation = useSetTotalTime();

  // URL sync
  const setView = useCallback(
    (view: CalendarView) => {
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(searchParams);
      params.set("view", view);
      if (view === "today") params.delete("date");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setViewDate = useCallback(
    (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      try {
        localStorage.setItem(DATE_KEY, iso);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(searchParams);
      params.set("date", iso);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Date range for the month grid.
  const { rangeStart, rangeEnd } = useMemo(() => {
    const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
    return {
      rangeStart: getStartOfDay(grid[0]),
      rangeEnd: getStartOfDay(grid[grid.length - 1]) + 86400000 - 1,
    };
  }, [viewDate]);

  // Filter steps by the selected path (including its descendants).
  const descendantPathIds = useMemo(
    () => getDescendantPathIds(selectedPathFilter, activePaths ?? []),
    [selectedPathFilter, activePaths]
  );
  const filteredSteps = useMemo(() => {
    const steps = allSteps ?? [];
    if (!selectedPathFilter) return steps;
    return steps.filter((s) => {
      const pid = s.path?._id || (typeof s.pathId === "string" ? s.pathId : null);
      return pid ? descendantPathIds.has(pid) : false;
    });
  }, [allSteps, selectedPathFilter, descendantPathIds]);

  // Routines are intentionally excluded from the calendar - recurring routine
  // occurrences clutter the month/timeline. The calendar shows steps only.
  const calendarDays = useCalendarEvents(
    filteredSteps,
    [],
    // Reminders aren't path-associated, so they show regardless of the path filter.
    reminders ?? [],
    rangeStart,
    rangeEnd,
    currentView === "month" ? viewDate.getMonth() : undefined
  );

  // Month navigation
  const goToday = useCallback(() => setViewDate(new Date()), [setViewDate]);
  const goPrev = useCallback(() => setViewDate(addMonths(viewDate, -1)), [viewDate, setViewDate]);
  const goNext = useCallback(() => setViewDate(addMonths(viewDate, 1)), [viewDate, setViewDate]);

  const monthOptions = useMemo(
    () =>
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map((label, i) => ({ value: String(i), label })),
    []
  );
  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    const vy = viewDate.getFullYear();
    const min = Math.min(cur - 50, vy);
    const max = Math.max(cur + 50, vy);
    const arr: { value: string; label: string }[] = [];
    for (let y = min; y <= max; y++) arr.push({ value: String(y), label: String(y) });
    return arr;
  }, [viewDate]);
  const setMonthIndex = useCallback(
    (m: number) => setViewDate(new Date(viewDate.getFullYear(), m, 1)),
    [viewDate, setViewDate]
  );
  const setYear = useCallback(
    (y: number) => setViewDate(new Date(y, viewDate.getMonth(), 1)),
    [viewDate, setViewDate]
  );

  const handleDayClick = useCallback((date: Date) => setSelectedDate(date), []);

  // Step actions for day detail panel
  const handleToggle = useCallback(
    async (id: string) => {
      try {
        await toggleStepMutation({ id });
      } catch (e) {
        reportError("mutation", e, { action: "toggleStep", stepId: id });
        toast.error("Failed to toggle step");
      }
    },
    [toggleStepMutation, toast]
  );

  const handleToggleFailed = useCallback(
    async (id: string) => {
      try {
        await toggleFailedMutation({ id });
      } catch (e) {
        reportError("mutation", e, { action: "toggleFailed", stepId: id });
        toast.error("Failed to update step");
      }
    },
    [toggleFailedMutation, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteStepMutation({ id });
        toast.success("Step deleted");
      } catch (e) {
        reportError("mutation", e, { action: "deleteStep", stepId: id });
        toast.error("Failed to delete step");
      }
    },
    [deleteStepMutation, toast]
  );

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

  const handleTogglePriority = useCallback(
    async (id: string, current: boolean) => {
      try {
        await updateStepMutation({ id, prioritizedToday: !current });
      } catch (e) {
        reportError("mutation", e, { action: "togglePriority", stepId: id });
        toast.error("Failed to update priority");
      }
    },
    [updateStepMutation, toast]
  );

  const handleToggleTimer = useCallback(
    async (id: string) => {
      try {
        // Timers run in parallel, so this only ever touches the step you
        // clicked: no other running timer is stopped on its behalf.
        if (runningTimerStepIds.includes(id)) {
          await stopTimerMutation({ id });
        } else {
          await startTimerMutation({ id });
        }
      } catch (e) {
        reportError("mutation", e, { action: "toggleTimer", stepId: id });
        toast.error("Failed to toggle timer");
      }
    },
    [runningTimerStepIds, startTimerMutation, stopTimerMutation, toast]
  );

  const handleSetTotalTime = useCallback(
    async (id: string, totalTimeSpentMs: number) => {
      try {
        await setTotalTimeMutation({ id, totalTimeSpentMs });
      } catch (e) {
        reportError("mutation", e, { action: "setTotalTime", stepId: id });
        toast.error("Failed to update time");
      }
    },
    [setTotalTimeMutation, toast]
  );

  const stepActions = {
    onToggle: handleToggle,
    onToggleFailed: handleToggleFailed,
    onDelete: handleDelete,
    onSaveEdit: handleSaveEdit,
    onTogglePriority: handleTogglePriority,
    onToggleTimer: handleToggleTimer,
    onSetTotalTime: handleSetTotalTime,
    paths: activePaths ?? [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {currentView === "today"
            ? "Today's focus"
            : currentView === "daylog"
              ? "Day log"
              : "Calendar"}
        </h1>
        <Tabs
          defaultValue="today"
          value={currentView}
          onValueChange={(v) => setView(v as CalendarView)}
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="daylog">Day log</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Controls for month view: navigation, month-year jump, path filter */}
      {currentView === "month" && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon-sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={goNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Select
              triggerClassName="w-36"
              value={String(viewDate.getMonth())}
              onValueChange={(v) => setMonthIndex(Number(v))}
              options={monthOptions}
            />
            <Select
              triggerClassName="w-24"
              value={String(viewDate.getFullYear())}
              onValueChange={(v) => setYear(Number(v))}
              options={yearOptions}
            />
          </div>
          <HierarchicalPathSelector
            paths={activePaths ?? []}
            selectedPathId={selectedPathFilter || null}
            onChange={(id) => setSelectedPathFilter(id || "")}
            placeholder="All paths"
            allowEmpty
            className="lg:w-56"
          />
        </div>
      )}

      {/* Views */}
      {currentView === "today" && <TodayView />}
      {currentView === "daylog" && <DayLogView viewDate={viewDate} onNavigate={setViewDate} />}
      {currentView === "month" && (
        <MonthView viewDate={viewDate} calendarDays={calendarDays} onDayClick={handleDayClick} />
      )}

      {/* Day detail dialog for month click */}
      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && (
            <DayDetailPanel
              date={selectedDate}
              calendarDays={calendarDays}
              stepActions={stepActions}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
