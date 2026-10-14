import type { SnapshotTable } from "./snapshot";

type Check = (value: unknown) => boolean;
type Fields = Record<string, Check>;
const string: Check = (v) => typeof v === "string";
const id: Check = (v) => typeof v === "string" && v.length > 0;
const number: Check = (v) => typeof v === "number" && Number.isFinite(v);
const boolean: Check = (v) => typeof v === "boolean";
const range =
  (min: number, max: number): Check =>
  (v) =>
    number(v) && Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const oneOf =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const record: Check = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const timestamps = { createdAt: number, updatedAt: number };
const named = { ...timestamps, title: string };
const archived = { archived: boolean, archivedAt: number };
const schedule = {
  daysOfWeek: (v: unknown) => Array.isArray(v) && v.every(range(0, 6)),
  dayOfMonth: range(1, 31),
  month: range(1, 12),
  dayOfYear: range(1, 31),
};
const rules: Record<SnapshotTable, { required: Fields; optional: Fields }> = {
  steps: {
    required: { ...named, completed: boolean, prioritizedToday: boolean },
    optional: {
      ...archived,
      description: string,
      completedAt: number,
      failed: boolean,
      failedAt: number,
      pathId: id,
      routineId: id,
      sortOrder: number,
      dueDate: number,
      startDate: number,
      timerStartedAt: number,
      totalTimeSpentMs: (v) => number(v) && (v as number) >= 0,
    },
  },
  paths: { required: named, optional: { ...archived, description: string, parentId: id } },
  routines: {
    required: {
      ...named,
      frequency: oneOf("daily", "weekdays", "weekly", "monthly", "yearly"),
      nextOccurrence: number,
    },
    optional: {
      ...schedule,
      description: string,
      pathId: id,
      autoPrioritize: boolean,
      dueOffsetDays: range(0, 365),
    },
  },
  reminders: {
    required: { ...named, recurrence: oneOf("once", "yearly", "monthly") },
    optional: { note: string, date: number, month: range(1, 12), day: range(1, 31) },
  },
  notebooks: { required: named, optional: { ...archived, description: string, sortOrder: number } },
  notes: {
    required: { ...named, notebookId: id, body: string },
    optional: { ...archived, sortOrder: number },
  },
  userSettings: {
    required: { updatedAt: number },
    optional: {
      theme: (v) => record(v) && Object.values(v as object).every(string),
      dayTurnoverMinutes: range(0, 1439),
      routineSpawnMinutes: range(0, 1439),
      utcOffsetMinutes: range(-840, 840),
    },
  },
  timeEntries: {
    required: {
      ...timestamps,
      stepId: id,
      stepTitle: string,
      start: number,
      end: number,
      durationMs: (v) => number(v) && (v as number) >= 0,
      source: oneOf("timer", "manual"),
    },
    optional: {},
  },
  activityEvents: {
    required: {
      ...timestamps,
      stepId: id,
      at: number,
      type: oneOf(
        "completed",
        "uncompleted",
        "failed",
        "unfailed",
        "archived",
        "unarchived",
        "field_changed",
        "time_adjusted"
      ),
    },
    optional: {
      field: oneOf("title", "description", "dueDate", "startDate", "pathId", "prioritizedToday"),
      oldValue: (v) => v === null || string(v) || boolean(v) || number(v),
      newValue: (v) => v === null || string(v) || boolean(v) || number(v),
    },
  },
};

export function validateSnapshotRows(table: SnapshotTable, rows: unknown[]): void {
  const ids = new Set<string>();
  const { required, optional } = rules[table];
  for (const value of rows) {
    if (!record(value) || !id((value as Record<string, unknown>)._id)) {
      throw new Error(`That snapshot has a row in "${table}" with no id.`);
    }
    const row = value as Record<string, unknown>;
    if (ids.has(row._id as string))
      throw new Error(`That snapshot has duplicate ids in "${table}".`);
    ids.add(row._id as string);
    for (const [field, check] of Object.entries(required)) {
      if (!check(row[field]))
        throw new Error(`That snapshot has an invalid "${field}" in "${table}".`);
    }
    for (const [field, check] of Object.entries(optional)) {
      if (row[field] !== undefined && !check(row[field])) {
        throw new Error(`That snapshot has an invalid "${field}" in "${table}".`);
      }
    }
    if (
      table === "timeEntries" &&
      ((row.end as number) < (row.start as number) ||
        row.durationMs !== (row.end as number) - (row.start as number))
    ) {
      throw new Error("That snapshot has an inconsistent time entry.");
    }
  }
  if (table === "paths") {
    const parents = new Map(
      rows.map((r) => {
        const p = r as { _id: string; parentId?: string };
        return [p._id, p.parentId];
      })
    );
    const checked = new Set<string>();
    for (const start of parents.keys()) {
      const chain = new Set<string>();
      let current: string | undefined = start;
      while (current && !checked.has(current)) {
        if (chain.has(current)) throw new Error("That snapshot has a circular path hierarchy.");
        chain.add(current);
        current = parents.get(current);
      }
      for (const key of chain) checked.add(key);
    }
  }
}
