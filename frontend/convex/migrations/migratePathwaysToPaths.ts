import { mutation } from "../_generated/server";

/**
 * Migration: Convert pathways to root paths
 *
 * This migration converts the old pathway-based hierarchy to the new
 * self-referential paths structure.
 *
 * Steps:
 * 1. Fetch all pathways
 * 2. Create a map of pathwayId → newPathId for parent resolution
 * 3. First pass: Create root paths from pathways (those without parentId)
 * 4. Second pass: Create nested paths from pathways with parentId
 * 5. Third pass: Update existing paths that were in pathway.pathIds to have correct parentId
 */
export const runMigration = mutation({
  handler: async (ctx) => {
    const results = {
      pathwaysConverted: 0,
      pathsUpdated: 0,
      errors: [] as string[],
    };

    try {
      // 1. Fetch all pathways
      const pathways = await ctx.db.query("pathways").collect();

      if (pathways.length === 0) {
        return { ...results, message: "No pathways to migrate" };
      }

      // 2. Create mapping: old pathway ID → new path ID
      const pathwayToNewPathMap = new Map<string, string>();

      // 3. First pass: Create paths from pathways without parentId (root pathways)
      const rootPathways = pathways.filter((pw) => !pw.parentId);
      for (const pathway of rootPathways) {
        const now = Date.now();
        const newPathId = await ctx.db.insert("paths", {
          title: pathway.title,
          description: pathway.description,
          parentId: undefined, // Root path
          connectedPathIds: undefined,
          connectedStepIds: undefined,
          createdAt: now,
          updatedAt: now,
        });

        pathwayToNewPathMap.set(pathway._id.toString(), newPathId.toString());
        results.pathwaysConverted++;
      }

      // 4. Second pass: Create paths from pathways with parentId (nested pathways)
      const nestedPathways = pathways.filter((pw) => pw.parentId);
      for (const pathway of nestedPathways) {
        const now = Date.now();
        const parentPathwayId = pathway.parentId?.toString();
        const newParentPathId = parentPathwayId
          ? pathwayToNewPathMap.get(parentPathwayId)
          : undefined;

        const newPathId = await ctx.db.insert("paths", {
          title: pathway.title,
          description: pathway.description,
          parentId: newParentPathId ? (newParentPathId as any) : undefined,
          connectedPathIds: undefined,
          connectedStepIds: undefined,
          createdAt: now,
          updatedAt: now,
        });

        pathwayToNewPathMap.set(pathway._id.toString(), newPathId.toString());
        results.pathwaysConverted++;
      }

      // 5. Third pass: Update existing paths that were in pathway.pathIds
      for (const pathway of pathways) {
        if (pathway.pathIds && pathway.pathIds.length > 0) {
          // Find the new path ID that corresponds to this pathway
          const newParentPathId = pathwayToNewPathMap.get(pathway._id.toString());

          if (newParentPathId) {
            for (const oldPathId of pathway.pathIds) {
              try {
                const existingPath = await ctx.db.get(oldPathId);
                if (existingPath) {
                  await ctx.db.patch(oldPathId, {
                    parentId: newParentPathId as any,
                    updatedAt: Date.now(),
                  });
                  results.pathsUpdated++;
                }
              } catch (error) {
                results.errors.push(
                  `Failed to update path ${oldPathId}: ${error}`
                );
              }
            }
          }
        }
      }

      return {
        ...results,
        message: `Migration complete. Converted ${results.pathwaysConverted} pathways, updated ${results.pathsUpdated} paths.`,
        pathwayToNewPathMap: Object.fromEntries(pathwayToNewPathMap),
      };
    } catch (error) {
      results.errors.push(`Migration failed: ${error}`);
      return results;
    }
  },
});

/**
 * Cleanup: Delete all pathways after migration is verified
 * Run this ONLY after verifying the migration was successful
 */
export const cleanupPathways = mutation({
  handler: async (ctx) => {
    const pathways = await ctx.db.query("pathways").collect();
    let deleted = 0;

    for (const pathway of pathways) {
      await ctx.db.delete(pathway._id);
      deleted++;
    }

    return { deleted, message: `Deleted ${deleted} pathways` };
  },
});
