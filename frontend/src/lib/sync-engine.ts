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

      for (const entry of entries) {
        try {
          await db.syncQueue.update(entry.id!, { status: 'in-progress' });
          await this.processSyncEntry(entry);
          await db.syncQueue.delete(entry.id!);
        } catch (error) {
          reportError('sync', error, { entityType: entry.entityType, entityId: entry.entityId, operation: entry.operation, retryCount: entry.retryCount });
          const newRetryCount = (entry.retryCount || 0) + 1;
          const lastError = error instanceof Error ? error.message : String(error);
          if (newRetryCount >= MAX_RETRIES) {
            await db.syncQueue.update(entry.id!, { status: 'failed', retryCount: newRetryCount, lastError });
          } else {
            await db.syncQueue.update(entry.id!, { status: 'pending', retryCount: newRetryCount, lastError });
          }
        }
      }
    } finally {
      this.isPushing = false;
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
      case 'pathways':
        await this.syncPathway(entityId, operation, entry.data);
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
        parentId: this.resolveId(localStep.parentId) as Id<'steps'> | undefined,
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
        // Timer fields — handle via dedicated mutations, don't pass to updateStep
        if ('timerStartedAt' in data && data.timerStartedAt !== undefined) {
          // Start timer
          await this.client.mutation(api.steps.startTimer, { id: resolvedId as Id<'steps'> });
        } else if ('totalTimeSpentMs' in data && 'timerStartedAt' in data && data.timerStartedAt === undefined) {
          // Stop timer (both totalTimeSpentMs and timerStartedAt=undefined present)
          await this.client.mutation(api.steps.stopTimer, { id: resolvedId as Id<'steps'> });
        } else if ('totalTimeSpentMs' in data && !('timerStartedAt' in data)) {
          // Manual time set (only totalTimeSpentMs, no timerStartedAt key)
          // Server clears the field when 0 is passed (back to default)
          await this.client.mutation(api.steps.setTotalTime, {
            id: resolvedId as Id<'steps'>,
            totalTimeSpentMs: (data.totalTimeSpentMs as number) ?? 0,
          });
        }
        // sortOrder + parentId (reorder)
        if ('sortOrder' in data && 'parentId' in data) {
          // Individual reorder updates are already handled batch-wise by the page
          // Just patch
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
        connectedPathIds: localPath.connectedPathIds?.map(id => this.resolveId(id) as Id<'paths'>),
        connectedStepIds: localPath.connectedStepIds?.map(id => this.resolveId(id) as Id<'steps'>),
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
      if (data.connectedPathIds !== undefined) {
        updateData.connectedPathIds = (data.connectedPathIds as string[]).map(id => this.resolveId(id) as Id<'paths'>);
      }
      if (data.connectedStepIds !== undefined) {
        updateData.connectedStepIds = (data.connectedStepIds as string[]).map(id => this.resolveId(id) as Id<'steps'>);
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

  private async syncPathway(entityId: string, operation: string, data?: Record<string, unknown>) {
    const resolvedId = this.resolveId(entityId)!;

    if (operation === 'create') {
      const localPathway = await db.pathways.get(entityId);
      if (!localPathway) return;

      const result = await this.client.mutation(api.pathways.createPathway, {
        title: localPathway.title,
        description: localPathway.description,
        parentId: this.resolveId(localPathway.parentId) as Id<'pathways'> | undefined,
        pathIds: localPathway.pathIds?.map(id => this.resolveId(id) as Id<'paths'>),
      });

      if (result && result._id) {
        const serverId = result._id.toString();
        await this.remapId(entityId, serverId, 'pathways');
      }
    } else if (operation === 'update') {
      if (this.isLocalId(resolvedId)) return;
      if (!data) return;

      const updateData: Record<string, unknown> = { id: resolvedId as Id<'pathways'> };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.parentId !== undefined) updateData.parentId = this.resolveId(data.parentId as string) as Id<'pathways'>;
      if (data.pathIds !== undefined) {
        updateData.pathIds = (data.pathIds as string[]).map(id => this.resolveId(id) as Id<'paths'>);
      }

      const keys = Object.keys(updateData).filter(k => k !== 'id');
      if (keys.length > 0) {
        await this.client.mutation(api.pathways.updatePathway, updateData as any);
      }
    } else if (operation === 'delete') {
      if (this.isLocalId(resolvedId)) {
        await db.pathways.delete(entityId);
        return;
      }
      await this.client.mutation(api.pathways.deletePathway, { id: resolvedId as Id<'pathways'> });
      await db.pathways.delete(entityId);
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

  private async remapId(localId: string, serverId: string, table: 'steps' | 'paths' | 'routines' | 'pathways') {
    this.idMap.set(localId, serverId);

    await db.transaction('rw', [db.steps, db.paths, db.routines, db.pathways, db.syncQueue], async () => {
      // Get the local record to preserve its data
      const tableRef = db[table] as any;
      const localRecord = await tableRef.get(localId);

      if (localRecord) {
        // Create new record with server ID, preserving all data
        const newRecord = { ...localRecord, _id: serverId, _localOnly: false };
        await tableRef.put(newRecord);
        // Delete old local record
        await tableRef.delete(localId);
      }

      // Update foreign keys in steps
      if (table === 'paths') {
        const stepsWithPath = await db.steps.where('pathId').equals(localId).toArray();
        for (const step of stepsWithPath) {
          await db.steps.update(step._id, { pathId: serverId });
        }
      }
      if (table === 'steps') {
        const childSteps = await db.steps.where('parentId').equals(localId).toArray();
        for (const child of childSteps) {
          await db.steps.update(child._id, { parentId: serverId });
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
        // connectedPathIds
        const allPaths = await db.paths.toArray();
        for (const p of allPaths) {
          if (p.connectedPathIds?.includes(localId)) {
            await db.paths.update(p._id, {
              connectedPathIds: p.connectedPathIds.map(id => id === localId ? serverId : id),
            });
          }
        }
      }
      // connectedStepIds — update when a step ID is remapped
      if (table === 'steps') {
        const allPaths = await db.paths.toArray();
        for (const p of allPaths) {
          if (p.connectedStepIds?.includes(localId)) {
            await db.paths.update(p._id, {
              connectedStepIds: p.connectedStepIds.map(id => id === localId ? serverId : id),
            });
          }
        }
      }

      // Update foreign keys in routines
      if (table === 'paths') {
        const routinesWithPath = await db.routines.filter(r => r.pathId === localId).toArray();
        for (const r of routinesWithPath) {
          await db.routines.update(r._id, { pathId: serverId });
        }
      }

      // Update foreign keys in pathways
      if (table === 'paths') {
        const allPathways = await db.pathways.toArray();
        for (const pw of allPathways) {
          if (pw.pathIds?.includes(localId)) {
            await db.pathways.update(pw._id, {
              pathIds: pw.pathIds.map(id => id === localId ? serverId : id),
            });
          }
        }
      }
      if (table === 'pathways') {
        const childPathways = await db.pathways.filter(pw => pw.parentId === localId).toArray();
        for (const pw of childPathways) {
          await db.pathways.update(pw._id, { parentId: serverId });
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
      // Get pending sync entity IDs to skip during merge
      const pendingEntries = await db.syncQueue.where('status').anyOf('pending', 'in-progress').toArray();
      const pendingEntityIds = new Set(pendingEntries.map(e => e.entityId));

      // Fetch all data from Convex
      const [serverSteps, serverPaths, serverRoutines, serverPathways, serverUserSettings] = await Promise.all([
        this.client.query(api.steps.getSteps),
        this.client.query(api.paths.getPaths),
        this.client.query(api.routines.getRoutines),
        this.client.query(api.pathways.getPathways),
        this.client.query(api.userSettings.getAllUserSettings),
      ]);

      await db.transaction('rw', [db.steps, db.paths, db.routines, db.pathways, db.userSettings, db.syncMeta], async () => {
        // Merge steps
        if (serverSteps) {
          await this.mergeEntities(
            'steps',
            serverSteps.map((s: any) => ({
              ...s,
              _id: s._id.toString(),
              pathId: s.pathId?.toString(),
              parentId: s.parentId?.toString(),
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
              connectedPathIds: p.connectedPathIds?.map((id: any) => id.toString()) || [],
              connectedStepIds: p.connectedStepIds?.map((id: any) => id.toString()) || [],
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

        // Merge pathways
        if (serverPathways) {
          await this.mergeEntities(
            'pathways',
            serverPathways.map((pw: any) => ({
              ...pw,
              _id: pw._id.toString(),
              parentId: pw.parentId?.toString(),
              pathIds: pw.pathIds?.map((id: any) => id.toString()) || [],
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
    tableName: 'steps' | 'paths' | 'routines' | 'pathways' | 'userSettings',
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
