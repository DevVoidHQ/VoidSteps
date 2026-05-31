import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const testUser = { name: "Test User", subject: "user-123" };

describe("paths", () => {
  // Auth
  describe("auth", () => {
    it("throws when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      await expect(t.query(api.paths.getRootPaths, {})).rejects.toThrow(
        "Unauthenticated"
      );

    });
  });

  // Queries
  describe("getRootPaths", () => {
    it("only returns paths with no parentId", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let parentId!: Id<"paths">;
      await t.run(async (ctx) => {
        parentId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Root Path",
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Child Path",
          parentId,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.paths.getRootPaths, {});
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Root Path");

    });
  });

  describe("getChildPaths", () => {
    it("only returns children of specified parent, scoped to user", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let parentId!: Id<"paths">;
      await t.run(async (ctx) => {
        parentId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Parent",
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Child 1",
          parentId,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Child 2",
          parentId,
          createdAt: now,
          updatedAt: now,
        });
        // Different user's child - should not appear
        await ctx.db.insert("paths", {
          userId: "other-user",
          title: "Other child",
          parentId,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.query(api.paths.getChildPaths, { parentId });
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.title).sort()).toEqual([
        "Child 1",
        "Child 2",
      ]);

    });
  });

  // Mutations
  describe("createPath", () => {
    it("inserts with timestamps", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);

      const result = await asUser.mutation(api.paths.createPath, {
        title: "New Path",
        description: "A test path",
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe("New Path");
      expect(result!.description).toBe("A test path");
      expect(result!.createdAt).toBeDefined();
      expect(result!.updatedAt).toBeDefined();

    });
  });

  describe("updatePath", () => {
    it("detects A→B→A circular reference", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathAId!: Id<"paths">;
      let pathBId!: Id<"paths">;
      await t.run(async (ctx) => {
        pathAId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path A",
          createdAt: now,
          updatedAt: now,
        });
        pathBId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path B",
          parentId: pathAId,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Try to set A's parent to B (would create A→B→A cycle)
      await expect(
        asUser.mutation(api.paths.updatePath, {
          id: pathAId,
          parentId: pathBId,
        })
      ).rejects.toThrow("circular reference");

    });

    it("detects A→B→C→A circular reference", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathAId!: Id<"paths">;
      let pathBId!: Id<"paths">;
      let pathCId!: Id<"paths">;
      await t.run(async (ctx) => {
        pathAId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path A",
          createdAt: now,
          updatedAt: now,
        });
        pathBId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path B",
          parentId: pathAId,
          createdAt: now,
          updatedAt: now,
        });
        pathCId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path C",
          parentId: pathBId,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Try to set A's parent to C (would create A→B→C→A cycle)
      await expect(
        asUser.mutation(api.paths.updatePath, {
          id: pathAId,
          parentId: pathCId,
        })
      ).rejects.toThrow("circular reference");

    });

    it("allows valid parent assignment", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathAId!: Id<"paths">;
      let pathBId!: Id<"paths">;
      await t.run(async (ctx) => {
        pathAId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path A",
          createdAt: now,
          updatedAt: now,
        });
        pathBId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path B",
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.paths.updatePath, {
        id: pathAId,
        parentId: pathBId,
      });

      expect(result!.parentId).toBe(pathBId);

    });

    it("updates archived and archivedAt", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathId!: Id<"paths">;
      await t.run(async (ctx) => {
        pathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Path",
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await asUser.mutation(api.paths.updatePath, {
        id: pathId,
        archived: true,
        archivedAt: now,
      });

      expect(result!.archived).toBe(true);
      expect(result!.archivedAt).toBe(now);

    });
  });

  describe("deletePath", () => {
    it("orphans children (sets their parentId to undefined)", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let parentId!: Id<"paths">;
      let childId!: Id<"paths">;
      await t.run(async (ctx) => {
        parentId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Parent",
          createdAt: now,
          updatedAt: now,
        });
        childId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Child",
          parentId,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.paths.deletePath, { id: parentId });

      // Parent should be deleted, child should still exist but with no parent
      await t.run(async (ctx) => {
        const parent = await ctx.db.get(parentId);
        const child = await ctx.db.get(childId);
        expect(parent).toBeNull();
        expect(child).not.toBeNull();
        expect(child!.parentId).toBeUndefined();
      });

    });
  });

  describe("deletePathWithMigration", () => {
    it("migrates steps to destination and orphans children to deleted path's parent", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let grandparentId: Id<"paths">;
      let pathToDeleteId!: Id<"paths">;
      let childPathId!: Id<"paths">;
      let destinationPathId!: Id<"paths">;
      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        grandparentId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Grandparent",
          createdAt: now,
          updatedAt: now,
        });
        pathToDeleteId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "To Delete",
          parentId: grandparentId,
          createdAt: now,
          updatedAt: now,
        });
        childPathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Child Path",
          parentId: pathToDeleteId,
          createdAt: now,
          updatedAt: now,
        });
        destinationPathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "Destination",
          createdAt: now,
          updatedAt: now,
        });
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step to migrate",
          completed: false,
          failed: false,
          pathId: pathToDeleteId,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.paths.deletePathWithMigration, {
        id: pathToDeleteId,
        destinationPathId,
      });

      await t.run(async (ctx) => {
        // Path should be deleted
        const deletedPath = await ctx.db.get(pathToDeleteId);
        expect(deletedPath).toBeNull();

        // Step should be migrated to destination
        const step = await ctx.db.get(stepId);
        expect(step!.pathId).toBe(destinationPathId);

        // Child path should be orphaned to grandparent
        const child = await ctx.db.get(childPathId);
        expect(child!.parentId).toBe(grandparentId);
      });

    });

    it("clears pathId when no destination provided", async () => {
      const t = convexTest(schema, modules);
      const asUser = t.withIdentity(testUser);
      const now = Date.now();

      let pathId!: Id<"paths">;
      let stepId!: Id<"steps">;
      await t.run(async (ctx) => {
        pathId = await ctx.db.insert("paths", {
          userId: "user-123",
          title: "To Delete",
          createdAt: now,
          updatedAt: now,
        });
        stepId = await ctx.db.insert("steps", {
          userId: "user-123",
          title: "Step",
          completed: false,
          failed: false,
          pathId,
          prioritizedToday: false,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      });

      await asUser.mutation(api.paths.deletePathWithMigration, {
        id: pathId,
      });

      await t.run(async (ctx) => {
        const step = await ctx.db.get(stepId);
        expect(step!.pathId).toBeUndefined();
      });

    });
  });
});
