import type { LocalPath, LocalStep } from "../db";
import { db } from "../db";
import { generateLocalId, logStepEvents, validateDescription, validateTitle } from "./helpers";

export const createPath = async (args: {
  title: string;
  description?: string;
  parentId?: string;
}) => {
  validateTitle(args.title);
  validateDescription(args.description);
  const now = Date.now();
  const id = generateLocalId();

  const path: LocalPath = {
    _id: id,
    title: args.title,
    description: args.description,
    parentId: args.parentId,
    createdAt: now,
    updatedAt: now,
  };

  await db.paths.add(path);
  return path;
};

export const updatePath = async (args: {
  id: string;
  title?: string;
  description?: string;
  parentId?: string | null;
}) => {
  if (args.title !== undefined) validateTitle(args.title);
  if (args.description !== undefined) validateDescription(args.description);
  const { id, parentId, ...otherUpdates } = args;
  const existing = await db.paths.get(id);
  if (!existing) throw new Error("Path not found");

  // Circular reference check
  if (parentId !== undefined && parentId !== null) {
    let currentId: string | undefined = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === id) throw new Error("Cannot set parent: would create circular reference");
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const current: LocalPath | undefined = await db.paths.get(currentId);
      currentId = current?.parentId;
    }
  }

  const patchData: Partial<LocalPath> = { ...otherUpdates, updatedAt: Date.now() };
  if (parentId !== undefined) {
    patchData.parentId = parentId === null ? undefined : parentId;
  }

  await db.paths.update(id, patchData);
};

export const archivePath = async (args: { id: string }) => {
  const now = Date.now();

  // The whole subtree must flip together: a partial archive leaves some
  // descendant paths and steps archived and others live, and there is no
  // server to reconcile that split against in this local-only app.
  await db.transaction("rw", [db.paths, db.steps, db.activityEvents], async () => {
    // Recursively collect all descendant paths
    const allPathIds: string[] = [args.id];
    const collectDescendants = async (parentId: string) => {
      const children = await db.paths.where("parentId").equals(parentId).toArray();
      for (const child of children) {
        allPathIds.push(child._id);
        await collectDescendants(child._id);
      }
    };
    await collectDescendants(args.id);

    await db.paths
      .where("_id")
      .anyOf(allPathIds)
      .modify({ archived: true, archivedAt: now, updatedAt: now });

    const steps = await db.steps.where("pathId").anyOf(allPathIds).toArray();
    const patch: Partial<LocalStep> = { archived: true, archivedAt: now, updatedAt: now };
    await db.steps.bulkPut(steps.map((step) => ({ ...step, ...patch })));
    for (const step of steps) {
      await logStepEvents(step, patch, now);
    }
  });
};

export const unarchivePath = async (args: { id: string }) => {
  const now = Date.now();

  // Same reasoning as archive: the subtree unarchives as one unit or not
  // at all, since a half-restored tree can't be repaired from anywhere else.
  await db.transaction("rw", [db.paths, db.steps, db.activityEvents], async () => {
    // Recursively collect all descendant paths
    const allPathIds: string[] = [args.id];
    const collectDescendants = async (parentId: string) => {
      const children = await db.paths.where("parentId").equals(parentId).toArray();
      for (const child of children) {
        allPathIds.push(child._id);
        await collectDescendants(child._id);
      }
    };
    await collectDescendants(args.id);

    await db.paths
      .where("_id")
      .anyOf(allPathIds)
      .modify({ archived: false, archivedAt: undefined, updatedAt: now });

    const steps = await db.steps
      .where("pathId")
      .anyOf(allPathIds)
      .filter((s) => s.archived === true)
      .toArray();
    const patch: Partial<LocalStep> = { archived: false, archivedAt: undefined, updatedAt: now };
    await db.steps.bulkPut(steps.map((step) => ({ ...step, ...patch })));
    for (const step of steps) {
      await logStepEvents(step, patch, now);
    }
  });
};

export const deletePathWithMigration = async (args: {
  id: string;
  destinationPathId?: string | null;
}) => {
  const now = Date.now();

  // Migrating steps, re-parenting child paths, and deleting the path are one
  // move: stopping partway would strand steps or child paths pointing at a
  // path that no longer exists, with nothing to reconcile against.
  await db.transaction("rw", [db.paths, db.steps, db.activityEvents], async () => {
    const existing = await db.paths.get(args.id);
    if (!existing) throw new Error("Path not found");

    // Migrate all steps from this path to destination
    const steps = await db.steps.where("pathId").equals(args.id).toArray();

    const newPathId = args.destinationPathId || undefined;
    const patch: Partial<LocalStep> = { pathId: newPathId, updatedAt: now };
    // bulkPut replaces the row, so clearing pathId has to DELETE the key
    // rather than write `undefined` into it. Dexie's update() dropped the
    // key, and spreading a patch whose value is undefined would instead
    // keep it with an undefined value. Both read the same and neither is
    // indexable, but only one of them round-trips a strict snapshot import.
    await db.steps.bulkPut(
      steps.map(({ pathId: _cleared, ...rest }) =>
        newPathId === undefined
          ? { ...rest, updatedAt: now }
          : { ...rest, pathId: newPathId, updatedAt: now }
      )
    );
    for (const step of steps) {
      await logStepEvents(step, patch, now);
    }

    // Orphan child paths to deleted path's parent
    const newParentId = existing.parentId || undefined;
    await db.paths
      .where("parentId")
      .equals(args.id)
      .modify({ parentId: newParentId, updatedAt: now });

    // Delete the path
    await db.paths.delete(args.id);
  });
};
