import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { SyncQueueEntry } from '@/lib/db';

export interface FailedSyncItem {
  queueEntryId: number;
  entityType: SyncQueueEntry['entityType'];
  entityId: string;
  operation: SyncQueueEntry['operation'];
  entityName: string;
  lastError: string | null;
  retryCount: number;
  createdAt: number;
}

async function resolveEntityName(
  entityType: SyncQueueEntry['entityType'],
  entityId: string,
  data?: Record<string, unknown>
): Promise<string> {
  try {
    const table = entityType === 'userSettings' ? db.userSettings : db[entityType];
    const entity = await table.get(entityId);
    if (entity && 'title' in entity && typeof entity.title === 'string') {
      return entity.title;
    }
  } catch {
    // Entity not found in local DB
  }

  // Fallback to snapshot data from the queue entry
  if (data && typeof data.title === 'string') {
    return data.title;
  }

  if (entityType === 'userSettings') return 'User Settings';

  const typeLabels: Record<string, string> = {
    steps: 'Step',
    paths: 'Path',
    routines: 'Routine',
    pathways: 'Pathway',
  };
  return `Unknown ${typeLabels[entityType] || entityType}`;
}

export function useFailedSyncItems(): FailedSyncItem[] {
  return useLiveQuery(
    async () => {
      const entries = await db.syncQueue
        .where('status')
        .equals('failed')
        .sortBy('createdAt');

      const items: FailedSyncItem[] = await Promise.all(
        entries.reverse().map(async (entry) => ({
          queueEntryId: entry.id!,
          entityType: entry.entityType,
          entityId: entry.entityId,
          operation: entry.operation,
          entityName: await resolveEntityName(entry.entityType, entry.entityId, entry.data),
          lastError: entry.lastError ?? null,
          retryCount: entry.retryCount,
          createdAt: entry.createdAt,
        }))
      );

      return items;
    },
    [],
    []
  );
}
