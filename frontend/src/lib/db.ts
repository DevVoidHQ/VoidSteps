import Dexie, { type EntityTable } from 'dexie';

// --- Entity types mirroring Convex schema + local metadata ---

export interface LocalStep {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: number;
  failed?: boolean;
  failedAt?: number;
  pathId?: string;
  routineId?: string;
  prioritizedToday: boolean;
  sortOrder?: number;
  dueDate?: number;
  startDate?: number;
  timerStartedAt?: number;
  totalTimeSpentMs?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
  // Local metadata
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalPath {
  _id: string;
  title: string;
  description?: string;
  parentId?: string;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalRoutine {
  _id: string;
  title: string;
  description?: string;
  pathId?: string;
  frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  dayOfYear?: number;
  nextOccurrence: number;
  autoPrioritize?: boolean;
  createdAt: number;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalReminder {
  _id: string;
  title: string;
  note?: string;
  recurrence: 'once' | 'yearly' | 'monthly';
  date?: number; // once: start-of-day timestamp
  month?: number; // yearly: 1-12
  day?: number; // yearly + monthly: 1-31
  createdAt: number;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalNotebook {
  _id: string;
  title: string;
  description?: string;
  sortOrder?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalNote {
  _id: string;
  notebookId: string;
  title: string;
  body: string; // markdown
  sortOrder?: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface LocalUserSettings {
  _id: string;
  userId: string;
  theme: Record<string, string>;
  updatedAt: number;
  _localOnly?: boolean;
  _deleted?: boolean;
}

export interface SyncQueueEntry {
  id?: number; // auto-increment
  entityType: 'steps' | 'paths' | 'routines' | 'reminders' | 'userSettings' | 'notebooks' | 'notes';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
  status: 'pending' | 'in-progress' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: number;
}

export interface ErrorLogEntry {
  id?: number;
  category: 'sync' | 'mutation' | 'render' | 'network';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
  reported: boolean;
}

export interface SyncMeta {
  key: string;
  value: string | number;
}

// --- Database class ---

class VoidStepsDB extends Dexie {
  steps!: EntityTable<LocalStep, '_id'>;
  paths!: EntityTable<LocalPath, '_id'>;
  routines!: EntityTable<LocalRoutine, '_id'>;
  reminders!: EntityTable<LocalReminder, '_id'>;
  notebooks!: EntityTable<LocalNotebook, '_id'>;
  notes!: EntityTable<LocalNote, '_id'>;
  userSettings!: EntityTable<LocalUserSettings, '_id'>;
  syncQueue!: EntityTable<SyncQueueEntry, 'id'>;
  syncMeta!: EntityTable<SyncMeta, 'key'>;
  errorLog!: EntityTable<ErrorLogEntry, 'id'>;

  constructor() {
    super('voidsteps');

    this.version(1).stores({
      steps: '_id, pathId, parentId, routineId, updatedAt',
      paths: '_id, parentId, updatedAt',
      routines: '_id, nextOccurrence, updatedAt',
      pathways: '_id, parentId, updatedAt',
      userSettings: '_id, userId',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      syncMeta: 'key',
    });

    this.version(2).stores({
      steps: '_id, pathId, parentId, routineId, updatedAt',
      paths: '_id, parentId, updatedAt',
      routines: '_id, nextOccurrence, updatedAt',
      pathways: '_id, parentId, updatedAt',
      userSettings: '_id, userId',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      syncMeta: 'key',
      errorLog: '++id, category, timestamp, reported',
    });

    // v3: adds lastError to syncQueue entries (no index change needed)
    this.version(3).stores({
      steps: '_id, pathId, parentId, routineId, updatedAt',
      paths: '_id, parentId, updatedAt',
      routines: '_id, nextOccurrence, updatedAt',
      pathways: '_id, parentId, updatedAt',
      userSettings: '_id, userId',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      syncMeta: 'key',
      errorLog: '++id, category, timestamp, reported',
    });

    // v4: notebooks + notes (2-level notes hierarchy)
    this.version(4).stores({
      steps: '_id, pathId, parentId, routineId, updatedAt',
      paths: '_id, parentId, updatedAt',
      routines: '_id, nextOccurrence, updatedAt',
      pathways: '_id, parentId, updatedAt',
      notebooks: '_id, updatedAt',
      notes: '_id, notebookId, pathId, updatedAt',
      userSettings: '_id, userId',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      syncMeta: 'key',
      errorLog: '++id, category, timestamp, reported',
    });

    // v5: reminders (passive calendar markers)
    this.version(5).stores({
      steps: '_id, pathId, parentId, routineId, updatedAt',
      paths: '_id, parentId, updatedAt',
      routines: '_id, nextOccurrence, updatedAt',
      reminders: '_id, recurrence, date, updatedAt',
      pathways: '_id, parentId, updatedAt',
      notebooks: '_id, updatedAt',
      notes: '_id, notebookId, pathId, updatedAt',
      userSettings: '_id, userId',
      syncQueue: '++id, entityType, entityId, status, createdAt',
      syncMeta: 'key',
      errorLog: '++id, category, timestamp, reported',
    });

    // v6: sub-steps removed - drop the parentId index from steps.
    this.version(6).stores({
      steps: '_id, pathId, routineId, updatedAt',
    });

    // v7: pathways feature removed - drop the table and purge any queued
    // pathway sync ops so the engine never tries to push a deleted entity type.
    this.version(7)
      .stores({ pathways: null })
      .upgrade(async (tx) => {
        await tx.table('syncQueue').where('entityType').equals('pathways').delete();
      });

    // v8: note→path linking removed - drop the pathId index on notes.
    this.version(8).stores({
      notes: '_id, notebookId, updatedAt',
    });
  }
}

export const db = new VoidStepsDB();
