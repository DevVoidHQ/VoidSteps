import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { LocalTimeEntry, LocalActivityEvent } from '@/lib/db';
import { DAY_MS } from '@/lib/timesheet-utils';

/** Live time entries + activity events for one step (activity tab). */
export function useStepTimesheet(stepId: string | null): {
  entries: LocalTimeEntry[] | undefined;
  events: LocalActivityEvent[] | undefined;
} {
  const entries = useLiveQuery(
    () =>
      stepId
        ? db.timeEntries.where('stepId').equals(stepId).filter((e) => !e._deleted).toArray()
        : Promise.resolve([] as LocalTimeEntry[]),
    [stepId]
  );
  const events = useLiveQuery(
    () =>
      stepId
        ? db.activityEvents.where('stepId').equals(stepId).filter((e) => !e._deleted).toArray()
        : Promise.resolve([] as LocalActivityEvent[]),
    [stepId]
  );
  return { entries, events };
}

/** Live time entries overlapping the day starting at `dayStart` (local
 * midnight). Midnight-spanning sessions are included and clipped at render. */
export function useDayTimeEntries(dayStart: number): LocalTimeEntry[] | undefined {
  return useLiveQuery(
    () =>
      db.timeEntries
        .where('start')
        .below(dayStart + DAY_MS)
        .filter((e) => !e._deleted && e.end > dayStart)
        .toArray(),
    [dayStart]
  );
}
