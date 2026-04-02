import { useState, useCallback, useMemo } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import {
  addMonths,
  addDays,
  getMonthLabel,
  getMonthGrid,
  getStartOfDay,
} from "@/lib/calendar-utils";
import TodayView from "@/components/calendar/TodayView";
import MonthView from "@/components/calendar/MonthView";
import TimelineView from "@/components/calendar/TimelineView";
import DayDetailPanel from "@/components/calendar/DayDetailPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

type CalendarView = "today" | "month" | "timeline";

export default function Calendar() {
  const toast = useToast();
  const { allSteps, routines, activePaths, activeTimerStepId } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = (searchParams.get("view") as CalendarView) || "today";
  const dateParam = searchParams.get("date");
  const viewDate = dateParam ? new Date(dateParam) : new Date();
  if (isNaN(viewDate.getTime())) viewDate.setTime(Date.now());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
      const params = new URLSearchParams(searchParams);
      params.set("view", view);
      if (view === "today") params.delete("date");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setViewDate = useCallback(
    (date: Date) => {
      const params = new URLSearchParams(searchParams);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      params.set("date", `${y}-${m}-${d}`);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Date range for month/timeline
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (currentView === "month") {
      const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
      return {
        rangeStart: getStartOfDay(grid[0]),
        rangeEnd: getStartOfDay(grid[grid.length - 1]) + 86400000 - 1,
      };
    }
    // timeline: 30 days back → 30 days forward
    const start = getStartOfDay(addDays(new Date(), -30));
    const end = getStartOfDay(addDays(new Date(), 30)) + 86400000 - 1;
    return { rangeStart: start, rangeEnd: end };
  }, [currentView, viewDate]);

  const calendarDays = useCalendarEvents(
    allSteps ?? [],
    routines ?? [],
    rangeStart,
    rangeEnd,
    currentView === "month" ? viewDate.getMonth() : undefined
  );

  // Month navigation
  const goToday = useCallback(() => setViewDate(new Date()), [setViewDate]);
  const goPrev = useCallback(() => setViewDate(addMonths(viewDate, -1)), [viewDate, setViewDate]);
  const goNext = useCallback(() => setViewDate(addMonths(viewDate, 1)), [viewDate, setViewDate]);

  const handleDayClick = useCallback((date: Date) => setSelectedDate(date), []);

  // Step actions for day detail panel
  const handleToggle = useCallback(async (id: string) => {
    try { await toggleStepMutation({ id }); }
    catch (e) { reportError("mutation", e, { action: "toggleStep", stepId: id }); toast.error("Failed to toggle step"); }
  }, [toggleStepMutation, toast]);

  const handleToggleFailed = useCallback(async (id: string) => {
    try { await toggleFailedMutation({ id }); }
    catch (e) { reportError("mutation", e, { action: "toggleFailed", stepId: id }); toast.error("Failed to update step"); }
  }, [toggleFailedMutation, toast]);

  const handleDelete = useCallback(async (id: string) => {
    try { await deleteStepMutation({ id }); toast.success("Step deleted"); }
    catch (e) { reportError("mutation", e, { action: "deleteStep", stepId: id }); toast.error("Failed to delete step"); }
  }, [deleteStepMutation, toast]);

  const handleSaveEdit = useCallback(async (id: string, updates: Partial<Step>) => {
    try {
      const { path, ...cleanUpdates } = updates as Record<string, unknown>;
      await updateStepMutation({ id, ...cleanUpdates });
    } catch (e) { reportError("mutation", e, { action: "updateStep", stepId: id }); toast.error("Failed to update step"); }
  }, [updateStepMutation, toast]);

  const handleTogglePriority = useCallback(async (id: string, current: boolean) => {
    try { await updateStepMutation({ id, prioritizedToday: !current }); }
    catch (e) { reportError("mutation", e, { action: "togglePriority", stepId: id }); toast.error("Failed to update priority"); }
  }, [updateStepMutation, toast]);

  const handleToggleTimer = useCallback(async (id: string) => {
    try {
      if (activeTimerStepId === id) {
        await stopTimerMutation({ id });
      } else {
        if (activeTimerStepId) await stopTimerMutation({ id: activeTimerStepId });
        await startTimerMutation({ id });
      }
    } catch (e) { reportError("mutation", e, { action: "toggleTimer", stepId: id }); toast.error("Failed to toggle timer"); }
  }, [activeTimerStepId, startTimerMutation, stopTimerMutation, toast]);

  const handleSetTotalTime = useCallback(async (id: string, totalTimeSpentMs: number) => {
    try { await setTotalTimeMutation({ id, totalTimeSpentMs }); }
    catch (e) { reportError("mutation", e, { action: "setTotalTime", stepId: id }); toast.error("Failed to update time"); }
  }, [setTotalTimeMutation, toast]);

  const stepActions = {
    onToggle: handleToggle,
    onToggleFailed: handleToggleFailed,
    onDelete: handleDelete,
    onSaveEdit: handleSaveEdit,
    onTogglePriority: handleTogglePriority,
    onToggleTimer: handleToggleTimer,
    activeTimerStepId: activeTimerStepId ?? null,
    onSetTotalTime: handleSetTotalTime,
    paths: activePaths ?? [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {currentView === "today" ? "Today's Focus" : currentView === "month" ? "Calendar" : "Timeline"}
        </h1>
        <Tabs defaultValue="today" value={currentView} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Month navigation (only for month view) */}
      {currentView === "month" && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground ml-2">
            {getMonthLabel(viewDate)}
          </span>
        </div>
      )}

      {/* Views */}
      {currentView === "today" && <TodayView />}
      {currentView === "month" && (
        <MonthView
          viewDate={viewDate}
          calendarDays={calendarDays}
          onDayClick={handleDayClick}
        />
      )}
      {currentView === "timeline" && (
        <TimelineView calendarDays={calendarDays} onDayClick={handleDayClick} />
      )}

      {/* Day detail dialog for month/timeline click */}
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
