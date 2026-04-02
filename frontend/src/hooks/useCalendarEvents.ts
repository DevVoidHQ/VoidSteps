import { useMemo } from 'react';
import type { Step, Routine } from '@/types';
import { getStartOfDay, projectRoutineOccurrences } from '@/lib/calendar-utils';
import { isOverdue } from '@/lib/date-utils';

export type CalendarEventType = 'due' | 'start' | 'completed' | 'failed' | 'routine';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  timestamp: number;
  step?: Step;
  routine?: Routine;
  pathTitle?: string;
  isOverdue?: boolean;
}

export interface CalendarDay {
  date: Date;
  timestamp: number;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

function toNumber(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'string' ? Number(v) : v;
}

export function useCalendarEvents(
  allSteps: Step[],
  routines: Routine[],
  rangeStart: number,
  rangeEnd: number,
  currentMonth?: number // 0-indexed, for isCurrentMonth calculation
): Map<number, CalendarDay> {
  return useMemo(() => {
    const map = new Map<number, CalendarDay>();
    const today = new Date();
    const todayTs = getStartOfDay(today);

    function getOrCreateDay(timestamp: number): CalendarDay {
      const ts = getStartOfDay(new Date(timestamp));
      let day = map.get(ts);
      if (!day) {
        const date = new Date(ts);
        day = {
          date,
          timestamp: ts,
          events: [],
          isToday: ts === todayTs,
          isCurrentMonth: currentMonth !== undefined ? date.getMonth() === currentMonth : true,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
        map.set(ts, day);
      }
      return day;
    }

    function addEvent(timestamp: number | undefined, type: CalendarEventType, step: Step) {
      const ts = toNumber(timestamp);
      if (!ts || ts < rangeStart || ts > rangeEnd) return;

      const day = getOrCreateDay(ts);
      day.events.push({
        id: `${step._id}-${type}`,
        type,
        title: step.title,
        timestamp: ts,
        step,
        pathTitle: step.path?.title,
        isOverdue: type === 'due' ? isOverdue(step.dueDate) : undefined,
      });
    }

    // Process steps
    for (const step of allSteps) {
      if (step.dueDate) addEvent(step.dueDate, 'due', step);
      if (step.startDate) addEvent(step.startDate, 'start', step);
      if (step.completedAt) addEvent(toNumber(step.completedAt), 'completed', step);
      if (step.failedAt) addEvent(toNumber(step.failedAt), 'failed', step);
    }

    // Project routine occurrences
    for (const routine of routines) {
      const occurrences = projectRoutineOccurrences(routine, rangeStart, rangeEnd);
      for (const ts of occurrences) {
        const day = getOrCreateDay(ts);
        day.events.push({
          id: `routine-${routine._id}-${ts}`,
          type: 'routine',
          title: routine.title,
          timestamp: ts,
          routine,
          pathTitle: routine.path?.title,
        });
      }
    }

    // Sort events within each day: due first, then start, routine, completed, failed
    const typeOrder: Record<CalendarEventType, number> = {
      due: 0,
      start: 1,
      routine: 2,
      completed: 3,
      failed: 4,
    };
    for (const day of map.values()) {
      day.events.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    }

    return map;
  }, [allSteps, routines, rangeStart, rangeEnd, currentMonth]);
}
