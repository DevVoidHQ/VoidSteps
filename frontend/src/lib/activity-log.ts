import type { LocalStep, LocalActivityEvent, ActivityField } from './db';

// Fields whose changes are worth a row in a step's activity timeline. Strictly
// a whitelist: sortOrder (drag-reorder would spam dozens of events), timer
// fields (sessions are first-class timeEntries rows, not events), updatedAt and
// the derived *At stamps are all deliberately excluded.
const TRACKED_FIELDS: readonly ActivityField[] = [
  'title',
  'description',
  'dueDate',
  'startDate',
  'pathId',
  'prioritizedToday',
];

// Keep stored old/new values small: titles are truncated, descriptions log only
// the fact that they changed (their values can be 2000 chars).
const MAX_VALUE_LENGTH = 80;
const VALUELESS_FIELDS: ReadonlySet<ActivityField> = new Set(['description']);

function normalize(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

/**
 * Diff a step patch against the pre-patch row and return the activity events it
 * implies. Pure - the caller supplies the id generator and timestamp - so every
 * mutation logs through one testable code path.
 *
 * Lifecycle transitions (completed/failed/archived) become dedicated event
 * types; whitelisted field changes become `field_changed` with old/new values.
 */
export function stepEventsFromPatch(
  before: LocalStep,
  patch: Partial<LocalStep>,
  at: number,
  makeId: () => string
): LocalActivityEvent[] {
  const events: LocalActivityEvent[] = [];
  const base = () => ({
    _id: makeId(),
    stepId: before._id,
    at,
    createdAt: at,
    updatedAt: at,
  });

  if ('completed' in patch && patch.completed !== undefined && patch.completed !== before.completed) {
    events.push({ ...base(), type: patch.completed ? 'completed' : 'uncompleted' });
  }
  if ('failed' in patch && patch.failed !== undefined && (patch.failed ?? false) !== (before.failed ?? false)) {
    events.push({ ...base(), type: patch.failed ? 'failed' : 'unfailed' });
  }
  if ('archived' in patch && patch.archived !== undefined && (patch.archived ?? false) !== (before.archived ?? false)) {
    events.push({ ...base(), type: patch.archived ? 'archived' : 'unarchived' });
  }

  for (const field of TRACKED_FIELDS) {
    if (!(field in patch)) continue;
    // Compare RAW values (all tracked fields are primitives; ?? null keeps
    // undefined/null equivalent) and normalize only what is stored - comparing
    // truncated values would swallow edits past the truncation point.
    if ((before[field] ?? null) === (patch[field] ?? null)) continue;
    const valueless = VALUELESS_FIELDS.has(field);
    events.push({
      ...base(),
      type: 'field_changed',
      field,
      oldValue: valueless ? null : normalize(before[field]),
      newValue: valueless ? null : normalize(patch[field]),
    });
  }

  return events;
}
