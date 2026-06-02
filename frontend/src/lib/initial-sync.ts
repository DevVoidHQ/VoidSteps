import type { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { db } from './db';

export async function performInitialSync(client: ConvexReactClient): Promise<boolean> {
  // Check if we've already done initial sync
  const lastPull = await db.syncMeta.get('lastPullTimestamp');
  if (lastPull) return false; // Already synced before

  try {
    // Fetch all data from Convex in parallel
    const [serverSteps, serverPaths, serverRoutines, serverUserSettings] = await Promise.all([
      client.query(api.steps.getSteps),
      client.query(api.paths.getPaths),
      client.query(api.routines.getRoutines),
      client.query(api.userSettings.getAllUserSettings),
    ]);

    await db.transaction('rw', [db.steps, db.paths, db.routines, db.userSettings, db.syncMeta], async () => {
      // Bulk insert steps
      if (serverSteps) {
        const steps = serverSteps.map((s: any) => ({
          ...s,
          _id: s._id.toString(),
          pathId: s.pathId?.toString(),
          routineId: s.routineId?.toString(),
          path: undefined, // Don't store enriched path object
          _localOnly: false,
          _deleted: false,
        }));
        await db.steps.bulkPut(steps);
      }

      // Bulk insert paths
      if (serverPaths) {
        const paths = serverPaths.map((p: any) => ({
          ...p,
          _id: p._id.toString(),
          parentId: p.parentId?.toString(),
          _localOnly: false,
          _deleted: false,
        }));
        await db.paths.bulkPut(paths);
      }

      // Bulk insert routines
      if (serverRoutines) {
        const routines = serverRoutines.map((r: any) => ({
          ...r,
          _id: r._id.toString(),
          pathId: r.pathId?.toString(),
          path: undefined, // Don't store enriched path object
          _localOnly: false,
          _deleted: false,
        }));
        await db.routines.bulkPut(routines);
      }

      // Bulk insert user settings
      if (serverUserSettings) {
        const settings = serverUserSettings.map((s: any) => ({
          ...s,
          _id: s._id.toString(),
          userId: s.userId?.toString(),
          _localOnly: false,
          _deleted: false,
        }));
        await db.userSettings.bulkPut(settings);
      }

      // Mark initial sync complete
      await db.syncMeta.put({ key: 'lastPullTimestamp', value: Date.now() });
    });

    return true; // First sync performed
  } catch (error) {
    console.error('Initial sync failed:', error);
    throw error;
  }
}
