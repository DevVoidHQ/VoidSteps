import type { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { db } from './db';
import type { SyncQueueEntry } from './db';
import { reportError } from './error-store';

const MAX_RETRIES = 5;
const PUSH_INTERVAL = 5_000;
const PULL_INTERVAL = 60_000;

export class SyncEngine {
  private client: ConvexReactClient;
  private pushTimer: ReturnType<typeof setInterval> | null = null;
  private pullTimer: ReturnType<typeof setInterval> | null = null;
  private isPushing = false;
  private isPulling = false;
  // Maps local IDs to server IDs after push
  private idMap = new Map<string, string>();

  constructor(client: ConvexReactClient) {
    this.client = client;
  }

  start() {
    this.pushTimer = setInterval(() => this.pushSync(), PUSH_INTERVAL);
    this.pullTimer = setInterval(() => this.pullSync(), PULL_INTERVAL);
    // Run immediately
    this.pushSync();
    this.pullSync();
  }

  stop() {
    if (this.pushTimer) clearInterval(this.pushTimer);
    if (this.pullTimer) clearInterval(this.pullTimer);
    this.pushTimer = null;
    this.pullTimer = null;
  }

  // Resolve a potentially local ID to server ID
  private resolveId(localId: string | undefined): string | undefined {
    if (!localId) return localId;
    return this.idMap.get(localId) || localId;
  }

  private isLocalId(id: string): boolean {
    return id.startsWith('local_');
  }

  // ========================
  // PUSH SYNC (local → server)
  // ========================

  async pushSync() {
    if (this.isPushing || !navigator.onLine) return;
    this.isPushing = true;

    try {
      const entries = await db.syncQueue
        .where('status')
        .equals('pending')
        .sortBy('createdAt');
      if (entries.length === 0) return;

      try {
        // One round trip for the whole queue.
        await this.pushBatch(entries);
      } catch (error) {
        // Network/transport failure on the batch call: fall back to the
        // per-entry path so a single bad request can't stall everything.
        reportError('sync', error, { phase: 'pushBatch' });
        await this.pushPerEntry(entries);
      }
    } finally {
      this.isPushing = false;
    }
  }

  /** Mark a queue entry failed/retry after an error (shared by both paths). */
  private async failEntry(entry: SyncQueueEntry, error: unknown) {
    reportError('sync', error, { entityType: entry.entityType, entityId: entry.entityId, operation: entry.operation, retryCount: entry.retryCount });
    const newRetryCount = (entry.retryCount || 0) + 1;
    const lastError = error instanceof Error ? error.message : String(error);
    await db.syncQueue.update(entry.id!, {
      status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
      retryCount: newRetryCount,
      lastError,
    });
  }

  // ---- Legacy per-entry push, kept as a fallback for batch failures ----
  private async pushPerEntry(entries: SyncQueueEntry[]) {
    for (const entry of entries) {
      const fresh = await db.syncQueue.get(entry.id!);
      if (!fresh || fresh.status !== 'pending') continue;
      try {
        await db.syncQueue.update(entry.id!, { status: 'in-progress' });
        await this.processSyncEntry(fresh);
        await db.syncQueue.delete(entry.id!);
      } catch (error) {
        await this.failEntry(fresh, error);
      }
    }
  }

  // Build the create payload for a queue entry from its current local record.
  private async buildCreateData(entry: SyncQueueEntry): Promise<Record<string, unknown> | null> {
    const r = this.resolveId.bind(this);
    switch (entry.entityType) {
      case 'paths': {
        const p = await db.paths.get(entry.entityId);
        if (!p) return null;
        return { title: p.title, description: p.description, parentId: r(p.parentId) };
      }
      case 'steps': {
        const s = await db.steps.get(entry.entityId);
        if (!s) return null;
        return { title: s.title, description: s.description, pathId: r(s.pathId),
          routineId: r(s.routineId), prioritizedToday: s.prioritizedToday,
          dueDate: s.dueDate, startDate: s.startDate, createdAt: s.createdAt,
          // Carry completion/time so the server keeps it (single createStep drops these).
          completed: s.completed, completedAt: s.completedAt, totalTimeSpentMs: s.totalTimeSpentMs };
      }
      case 'routines': {
        const x = await db.routines.get(entry.entityId);
        if (!x) return null;
        return { title: x.title, description: x.description, pathId: r(x.pathId), frequency: x.frequency,
          daysOfWeek: x.daysOfWeek, dayOfMonth: x.dayOfMonth, month: x.month, dayOfYear: x.dayOfYear,
          autoPrioritize: x.autoPrioritize };
      }
      case 'reminders': {
        const x = await db.reminders.get(entry.entityId);
        if (!x) return null;
        return { title: x.title, note: x.note, recurrence: x.recurrence, date: x.date, month: x.month, day: x.day };
      }
      case 'notebooks': {
        const x = await db.notebooks.get(entry.entityId);
        if (!x) return null;
        return { title: x.title, description: x.description, sortOrder: x.sortOrder };
      }
      case 'notes': {
        const x = await db.notes.get(entry.entityId);
        if (!x) return null;
        return { notebookId: r(x.notebookId), title: x.title, body: x.body, sortOrder: x.sortOrder };
      }
      default:
        return null;
    }
  }

  private localTable(entityType: string) {
    return (db as any)[entityType];
  }

  /** Batch push: group the queue and send it in a single mutation. */
  private async pushBatch(entries: SyncQueueEntry[]) {
    const creates: { tempId: string; type: string; data: Record<string, unknown> }[] = [];
    const updates: { type: string; id: string; data: Record<string, unknown> }[] = [];
    const deletes: { type: string; id: string }[] = [];

    const createEntries = new Map<string, SyncQueueEntry>(); // tempId -> entry
    const updateEntries = new Map<string, SyncQueueEntry>(); // sent id -> entry
    const deleteEntries = new Map<string, SyncQueueEntry>(); // sent id -> entry
    const timerEntries: SyncQueueEntry[] = [];               // step timer updates -> per-entry

    for (const entry of entries) {
      const { entityType, entityId, operation } = entry;

      if (entityType === 'userSettings') {
        // Rare + special-cased; handle individually.
        timerEntries.push(entry);
        continue;
      }

      if (operation === 'create') {
        const data = await this.buildCreateData(entry);
        if (!data) { await db.syncQueue.delete(entry.id!); continue; }
        creates.push({ tempId: entityId, type: entityType, data });
        createEntries.set(entityId, entry);
      } else if (operation === 'update') {
        const resolvedId = this.resolveId(entityId)!;
        if (this.isLocalId(resolvedId)) { await db.syncQueue.delete(entry.id!); continue; }
        // Step timer changes go through dedicated mutations (per-entry path).
        if (entityType === 'steps' && entry.data &&
            ('timerStartedAt' in entry.data || 'totalTimeSpentMs' in entry.data)) {
          timerEntries.push(entry);
          continue;
        }
        updates.push({ type: entityType, id: resolvedId, data: entry.data ?? {} });
        updateEntries.set(resolvedId, entry);
      } else if (operation === 'delete') {
        const resolvedId = this.resolveId(entityId)!;
        if (this.isLocalId(resolvedId)) {
          await this.localTable(entityType).delete(entityId);
          await db.syncQueue.delete(entry.id!);
          continue;
        }
        deletes.push({ type: entityType, id: resolvedId });
        deleteEntries.set(resolvedId, entry);
      }
    }

    if (creates.length || updates.length || deletes.length) {
      const result = await this.client.mutation(api.batch.pushBatch, { creates, updates, deletes } as any);

      // Creates that succeeded: remap local→server, then drop the queue entry.
      for (const { tempId, serverId } of result.created as { tempId: string; serverId: string }[]) {
        const entry = createEntries.get(tempId);
        if (!entry) continue;
        await this.remapId(tempId, serverId, entry.entityType as any);
        await db.syncQueue.delete(entry.id!);
        createEntries.delete(tempId);
      }
      // Updates that succeeded.
      for (const id of result.updatedIds as string[]) {
        const entry = updateEntries.get(id);
        if (!entry) continue;
        await db.syncQueue.delete(entry.id!);
        updateEntries.delete(id);
      }
      // Deletes that succeeded: remove the local row too.
      for (const id of result.deletedIds as string[]) {
        const entry = deleteEntries.get(id);
        if (!entry) continue;
        await this.localTable(entry.entityType).delete(entry.entityId);
        await db.syncQueue.delete(entry.id!);
        deleteEntries.delete(id);
      }

      // Anything sent but not acknowledged → retry/fail.
      const leftovers = [...createEntries.values(), ...updateEntries.values(), ...deleteEntries.values()];
      for (const entry of leftovers) {
        await this.failEntry(entry, new Error('Not acknowledged by batch'));
      }
    }

    // Process special/timer entries individually.
    for (const entry of timerEntries) {
      try {
        await db.syncQueue.update(entry.id!, { status: 'in-progress' });
        await this.processSyncEntry(entry);
        await db.syncQueue.delete(entry.id!);
      } catch (error) {
        await this.failEntry(entry, error);
      }
    }
  }

  private async processSyncEntry(entry: SyncQueueEntry) {
    const { entityType, entityId, operation } = entry;

    switch (entityType) {
      case 'steps':
        await this.syncStep(entityId, operation, entry.data);
        break;
      case 'paths':
        await this.syncPath(entityId, operation, entry.data);
        break;
      case 'routines':
        await this.syncRoutine(entityId, operation, entry.data);
        break;
      case 'reminders':
        await this.syncReminder(entityId, operation, entry.data);
        break;
      case 'notebooks':
        await this.syncNotebook(entityId, operation, entry.data);
        break;
      case 'notes':
        await this.syncNote(entityId, operation, entry.data);
        break;
      case 'userSettings':
        await this.syncUserSettings(entityId, operation, entry.data);
        break;
    }
  }

  private async syncStep(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const localStep = await db.steps.get(entityId);
      if (!localStep) return;

      const result = await this.client.mutation(api.steps.createStep, {
        title: localStep.title,
        description: localStep.description,
        pathId: this.resolveId(localStep.pathId) as Id<'paths'> | undefined,
        routineId: this.resolveId(localStep.routineId) as Id<'routines'> | undefined,
        prioritizedToday: localStep.prioritizedToday,
        dueDate: localStep.dueDate,
        startDate: localStep.startDate,
      });

      if (result && result._id) {
        const serverId = result._id.toString();
        await this.remapId(entityId, serverId, 'steps');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return; // Can't update what server doesn't know about yet
      const updateData: Record<string, unknown> = { id: resolvedId as Id<'steps'> };

      if (data) {
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.completed !== undefined) updateData.completed = data.completed;
        if (data.prioritizedToday !== undefined) updateData.prioritizedToday = data.prioritizedToday;
        if ('pathId' in data) {
          const pid = this.resolveId(data.pathId as string | undefined);
          updateData.pathId = pid ? pid as Id<'paths'> : null;
        }
        if ('dueDate' in data) updateData.dueDate = data.dueDate ?? null;
        if ('startDate' in data) updateData.startDate = data.startDate ?? null;
        if ('failed' in data) updateData.failed = data.failed;
        if (data.archived !== undefined) updateData.archived = data.archived;
        if ('archivedAt' in data) updateData.archivedAt = data.archivedAt ?? null;
        // Timer fields - handle via dedicated mutations, don't pass to updateStep
        if ('timerStartedAt' in data && data.timerStartedAt !== undefined) {
          // Start timer — send the client's start instant so server and client
          // agree on the clock domain used to compute elapsed time.
          await this.client.mutation(api.steps.startTimer, {
            id: resolvedId as Id<'steps'>,
            timerStartedAt: data.timerStartedAt as number,
          });
        } else if ('totalTimeSpentMs' in data && 'timerStartedAt' in data && data.timerStartedAt === undefined) {
          // Stop timer (both totalTimeSpentMs and timerStartedAt=undefined present).
          // Send the client-accumulated total so no time is lost to clock skew.
          await this.client.mutation(api.steps.stopTimer, {
            id: resolvedId as Id<'steps'>,
            totalTimeSpentMs: (data.totalTimeSpentMs as number | undefined) ?? 0,
          });
        } else if ('totalTimeSpentMs' in data && !('timerStartedAt' in data)) {
          // Manual time set (only totalTimeSpentMs, no timerStartedAt key)
          // Server clears the field when 0 is passed (back to default)
          await this.client.mutation(api.steps.setTotalTime, {
            id: resolvedId as Id<'steps'>,
            totalTimeSpentMs: (data.totalTimeSpentMs as number) ?? 0,
          });
        }
      }

      // Only call updateStep if there are fields beyond just `id`
      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.steps.updateStep, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        // Never made it to server; just clean up locally
        await db.steps.delete(entityId);
        return;
      }
      await this.client.mutation(api.steps.deleteStep, { id: resolvedId as Id<'steps'> });
      await db.steps.delete(entityId);
    }
  }

  private async syncPath(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const localPath = await db.paths.get(entityId);
      if (!localPath) return;

      const result = await this.client.mutation(api.paths.createPath, {
        title: localPath.title,
        description: localPath.description,
        parentId: this.resolveId(localPath.parentId) as Id<'paths'> | undefined,
      });

      if (result && result._id) {
        const serverId = result._id.toString();
        await this.remapId(entityId, serverId, 'paths');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'paths'> };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if ('parentId' in data) {
        const pid = this.resolveId(data.parentId as string | undefined);
        updateData.parentId = pid ? pid as Id<'paths'> : null;
      }
      if (data.archived !== undefined) updateData.archived = data.archived;
      if ('archivedAt' in data) updateData.archivedAt = data.archivedAt ?? null;

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.paths.updatePath, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.paths.delete(entityId);
        return;
      }
      await this.client.mutation(api.paths.deletePath, { id: resolvedId as Id<'paths'> });
      await db.paths.delete(entityId);
    }
  }

  private async syncRoutine(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const localRoutine = await db.routines.get(entityId);
      if (!localRoutine) return;

      const result = await this.client.mutation(api.routines.createRoutine, {
        title: localRoutine.title,
        description: localRoutine.description,
        pathId: this.resolveId(localRoutine.pathId) as Id<'paths'> | undefined,
        frequency: localRoutine.frequency,
        daysOfWeek: localRoutine.daysOfWeek,
        dayOfMonth: localRoutine.dayOfMonth,
        month: localRoutine.month,
        dayOfYear: localRoutine.dayOfYear,
        autoPrioritize: localRoutine.autoPrioritize,
      });

      if (result) {
        const serverId = result.toString();
        await this.remapId(entityId, serverId, 'routines');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'routines'> };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if ('pathId' in data) {
        const pid = this.resolveId(data.pathId as string | undefined);
        updateData.pathId = pid ? pid as Id<'paths'> : null;
      }
      if (data.frequency !== undefined) updateData.frequency = data.frequency;
      if ('daysOfWeek' in data) updateData.daysOfWeek = data.daysOfWeek ?? null;
      if ('dayOfMonth' in data) updateData.dayOfMonth = data.dayOfMonth ?? null;
      if ('month' in data) updateData.month = data.month ?? null;
      if ('dayOfYear' in data) updateData.dayOfYear = data.dayOfYear ?? null;
      if (data.autoPrioritize !== undefined) updateData.autoPrioritize = data.autoPrioritize;

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.routines.updateRoutine, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.routines.delete(entityId);
        return;
      }
      await this.client.mutation(api.routines.deleteRoutine, { id: resolvedId as Id<'routines'> });
      await db.routines.delete(entityId);
    }
  }

  private async syncReminder(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const local = await db.reminders.get(entityId);
      if (!local) return;

      const result = await this.client.mutation(api.reminders.createReminder, {
        title: local.title,
        note: local.note,
        recurrence: local.recurrence,
        date: local.date,
        month: local.month,
        day: local.day,
      });

      if (result) {
        const serverId = result.toString();
        await this.remapId(entityId, serverId, 'reminders');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'reminders'> };
      if (data.title !== undefined) updateData.title = data.title;
      if ('note' in data) updateData.note = data.note ?? null;
      if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
      if ('date' in data) updateData.date = data.date ?? null;
      if ('month' in data) updateData.month = data.month ?? null;
      if ('day' in data) updateData.day = data.day ?? null;

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.reminders.updateReminder, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.reminders.delete(entityId);
        return;
      }
      await this.client.mutation(api.reminders.deleteReminder, { id: resolvedId as Id<'reminders'> });
      await db.reminders.delete(entityId);
    }
  }

  private async syncNotebook(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const local = await db.notebooks.get(entityId);
      if (!local) return;

      const result = await this.client.mutation(api.notebooks.createNotebook, {
        title: local.title,
        description: local.description,
      });

      if (result && result._id) {
        const serverId = result._id.toString();
        await this.remapId(entityId, serverId, 'notebooks');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'notebooks'> };
      if (data.title !== undefined) updateData.title = data.title;
      if ('description' in data) updateData.description = data.description ?? null;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.archived !== undefined) updateData.archived = data.archived;

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.notebooks.updateNotebook, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.notebooks.delete(entityId);
        return;
      }
      await this.client.mutation(api.notebooks.deleteNotebook, { id: resolvedId as Id<'notebooks'> });
      await db.notebooks.delete(entityId);
    }
  }

  private async syncNote(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const local = await db.notes.get(entityId);
      if (!local) return;

      const notebookId = this.resolveId(local.notebookId);
      if (!notebookId || this.isLocalId(notebookId)) {
        // Parent notebook hasn't synced yet - defer via error so we retry later.
        throw new Error('Parent notebook not yet synced');
      }

      const result = await this.client.mutation(api.notes.createNote, {
        notebookId: notebookId as Id<'notebooks'>,
        title: local.title,
        body: local.body,
      });

      if (result && result._id) {
        const serverId = result._id.toString();
        await this.remapId(entityId, serverId, 'notes');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'notes'> };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.body !== undefined) updateData.body = data.body;
      if (data.notebookId !== undefined) {
        const nbId = this.resolveId(data.notebookId as string);
        if (nbId && !this.isLocalId(nbId)) updateData.notebookId = nbId as Id<'notebooks'>;
      }
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.archived !== undefined) updateData.archived = data.archived;

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.notes.updateNote, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.notes.delete(entityId);
        return;
      }
      await this.client.mutation(api.notes.deleteNote, { id: resolvedId as Id<'notes'> });
      await db.notes.delete(entityId);
    }
  }

  private async syncUserSettings(entityId: string, operation: string, _data?: Record<string, unknown>) {
    if (operation === 'delete') return; // Settings are never deleted

    const localSettings = await db.userSettings.get(entityId);
    if (!localSettings) return;

    const resolvedUserId = this.resolveId(localSettings.userId);
    if (!resolvedUserId || this.isLocalId(resolvedUserId)) return;

    await this.client.mutation(api.userSettings.updateUserSettings, {
      userId: resolvedUserId,
      theme: localSettings.theme as any,
    });

    // Mark as no longer local-only
    await db.userSettings.update(entityId, { _localOnly: false });
  }

  // ========================
  // ID REMAPPING
  // ========================

  private async remapId(localId: string, serverId: string, table: 'steps' | 'paths' | 'routines' | 'reminders' | 'notebooks' | 'notes') {
    this.idMap.set(localId, serverId);

    await db.transaction('rw', [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.syncQueue], async () => {
      // Get the local record to preserve its data
      const tableRef = db[table] as any;
      const localRecord = await tableRef.get(localId);

      if (localRecord) {
        // If a record at serverId already exists (e.g. server-side dedup
        // returned an existing step for a routine), keep the existing one
        // and drop the local duplicate instead of overwriting.
        const existingAtServerId = await tableRef.get(serverId);
        if (!existingAtServerId) {
          const newRecord = { ...localRecord, _id: serverId, _localOnly: false };
          await tableRef.put(newRecord);
        }
        // Always remove the old local record
        await tableRef.delete(localId);
      }

      // Update foreign keys in steps
      if (table === 'paths') {
        const stepsWithPath = await db.steps.where('pathId').equals(localId).toArray();
        for (const step of stepsWithPath) {
          await db.steps.update(step._id, { pathId: serverId });
        }
      }
      if (table === 'routines') {
        const stepsWithRoutine = await db.steps.filter(s => s.routineId === localId).toArray();
        for (const step of stepsWithRoutine) {
          await db.steps.update(step._id, { routineId: serverId });
        }
      }

      // Update foreign keys in paths
      if (table === 'paths') {
        const childPaths = await db.paths.where('parentId').equals(localId).toArray();
        for (const p of childPaths) {
          await db.paths.update(p._id, { parentId: serverId });
        }
      }

      // Update foreign keys in routines
      if (table === 'paths') {
        const routinesWithPath = await db.routines.filter(r => r.pathId === localId).toArray();
        for (const r of routinesWithPath) {
          await db.routines.update(r._id, { pathId: serverId });
        }
      }

      // Update foreign keys in notes
      if (table === 'notebooks') {
        const notesInNotebook = await db.notes.where('notebookId').equals(localId).toArray();
        for (const n of notesInNotebook) {
          await db.notes.update(n._id, { notebookId: serverId });
        }
      }

      // Update remaining sync queue entries referencing old local ID
      const pendingEntries = await db.syncQueue.where('entityId').equals(localId).toArray();
      for (const entry of pendingEntries) {
        await db.syncQueue.update(entry.id!, { entityId: serverId });
      }
    });
  }

  // ========================
  // PULL SYNC (server → local)
  // ========================

  async pullSync() {
    if (this.isPulling || !navigator.onLine) return;
    this.isPulling = true;

    try {
      // Fetch all data from Convex
      const [serverSteps, serverPaths, serverRoutines, serverReminders, serverNotebooks, serverNotes, serverUserSettings] = await Promise.all([
        this.client.query(api.steps.getSteps),
        this.client.query(api.paths.getPaths),
        this.client.query(api.routines.getRoutines),
        this.client.query(api.reminders.getReminders),
        this.client.query(api.notebooks.getNotebooks),
        this.client.query(api.notes.getNotes),
        this.client.query(api.userSettings.getAllUserSettings),
      ]);

      await db.transaction('rw', [db.steps, db.paths, db.routines, db.reminders, db.notebooks, db.notes, db.userSettings, db.syncMeta, db.syncQueue], async () => {
        // Derive pending entity IDs INSIDE the merge transaction so step state
        // and queue state are read from one consistent snapshot. Reading this
        // before the transaction left a race: a local timer start (which writes
        // the step then enqueues a sync entry atomically) could land between the
        // pending read and the merge, so the merge saw the running timer but not
        // its pending entry and "server wins" cleared it — the timer paused on
        // its own a few seconds after starting. A genuine remote stop has no
        // local queue entry, so it still wins here (multi-device safe).
        const pendingEntries = await db.syncQueue.where('status').anyOf('pending', 'in-progress').toArray();
        const pendingEntityIds = new Set(pendingEntries.map(e => e.entityId));

        // Merge steps
        if (serverSteps) {
          await this.mergeEntities(
            'steps',
            serverSteps.map((s: any) => ({
              ...s,
              _id: s._id.toString(),
              pathId: s.pathId?.toString(),
              routineId: s.routineId?.toString(),
            })),
            pendingEntityIds
          );
        }

        // Merge paths
        if (serverPaths) {
          await this.mergeEntities(
            'paths',
            serverPaths.map((p: any) => ({
              ...p,
              _id: p._id.toString(),
              parentId: p.parentId?.toString(),
            })),
            pendingEntityIds
          );
        }

        // Merge routines
        if (serverRoutines) {
          await this.mergeEntities(
            'routines',
            serverRoutines.map((r: any) => ({
              ...r,
              _id: r._id.toString(),
              pathId: r.pathId?.toString(),
              path: undefined, // Don't store enriched path object
            })),
            pendingEntityIds
          );
        }

        // Merge reminders
        if (serverReminders) {
          await this.mergeEntities(
            'reminders',
            serverReminders.map((r: any) => ({
              ...r,
              _id: r._id.toString(),
            })),
            pendingEntityIds
          );
        }

        // Merge notebooks
        if (serverNotebooks) {
          await this.mergeEntities(
            'notebooks',
            serverNotebooks.map((n: any) => ({
              ...n,
              _id: n._id.toString(),
            })),
            pendingEntityIds
          );
        }

        // Merge notes
        if (serverNotes) {
          await this.mergeEntities(
            'notes',
            serverNotes.map((n: any) => ({
              ...n,
              _id: n._id.toString(),
              notebookId: n.notebookId?.toString(),
            })),
            pendingEntityIds
          );
        }

        // Merge user settings
        if (serverUserSettings) {
          await this.mergeEntities(
            'userSettings',
            serverUserSettings.map((s: any) => ({
              ...s,
              _id: s._id.toString(),
              userId: s.userId?.toString(),
            })),
            pendingEntityIds
          );
        }

        // Update last pull timestamp
        await db.syncMeta.put({ key: 'lastPullTimestamp', value: Date.now() });
      });
    } catch (error) {
      reportError('sync', error, { phase: 'pull' });
    } finally {
      this.isPulling = false;
    }
  }

  private async mergeEntities(
    tableName: 'steps' | 'paths' | 'routines' | 'reminders' | 'notebooks' | 'notes' | 'userSettings',
    serverRecords: any[],
    pendingEntityIds: Set<string>
  ) {
    const table = db[tableName] as any;
    const localRecords: any[] = await table.toArray();
    const localMap = new Map<string, any>(localRecords.map((r: any) => [r._id, r]));
    const serverIds = new Set(serverRecords.map((r: any) => r._id as string));

    // Upsert server records
    for (const serverRecord of serverRecords) {
      const localRecord = localMap.get(serverRecord._id);

      if (!localRecord) {
        // Server has it, local doesn't → add locally
        await table.put({ ...serverRecord, _deleted: false, _localOnly: false });
      } else if (!pendingEntityIds.has(serverRecord._id)) {
        // Both have it, no pending local sync → server wins if newer
        const serverUpdated = typeof serverRecord.updatedAt === 'number' ? serverRecord.updatedAt : 0;
        const localUpdated = typeof localRecord.updatedAt === 'number' ? localRecord.updatedAt : 0;

        if (serverUpdated >= localUpdated) {
          await table.put({ ...serverRecord, _deleted: false, _localOnly: false });
        }
      }
      // If pending local sync → keep local (push will reconcile)
    }

    // Delete local records that don't exist on server AND have no pending sync
    for (const [localId, localRecord] of localMap.entries()) {
      if (!serverIds.has(localId) && !pendingEntityIds.has(localId) && !localRecord._localOnly) {
        await table.delete(localId);
      }
    }
  }

  get pendingSyncCount(): number {
    return 0; // Will be queried reactively via useLiveQuery in OfflineContext
  }
}
