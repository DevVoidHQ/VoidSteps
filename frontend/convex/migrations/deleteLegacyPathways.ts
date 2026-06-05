import { mutation } from "../_generated/server";

/**
 * Cleanup migration: delete all leftover documents in the legacy `pathways`
 * table. Pathways were folded into self-referential paths long ago; the table
 * has been removed from the schema, so this reads it as an undeclared table
 * (`ctx.db` cast to any) and hard-deletes every remaining row.
 *
 * Safe to run multiple times, it's a no-op once the table is empty. Run from
 * the Convex dashboard (Functions → run) or `npx convex run
 * migrations/deleteLegacyPathways:runMigration`.
 */
export const runMigration = mutation({
  handler: async (ctx) => {
    // `pathways` is no longer in the schema, so it's untyped here.
    const db = ctx.db as any;
    const pathways = await db.query("pathways").collect();
    let deleted = 0;
    for (const pw of pathways) {
      await db.delete(pw._id);
      deleted++;
    }
    return { deleted, message: `Deleted ${deleted} legacy pathways` };
  },
});
