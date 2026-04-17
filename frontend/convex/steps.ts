import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

async function requireAuth(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// Queries
export const getSteps = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const steps = await ctx.db.query("steps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc").collect();

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      steps.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

export const getStep = query({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) return null;

    if (step.pathId) {
      const path = await ctx.db.get(step.pathId);
      return { ...step, path };
    }

    return { ...step, path: null };
  },
});

export const getActiveSteps = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    // Get start of today for startDate comparison
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const allSteps = await ctx.db
      .query("steps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), false))
      .order("desc")
      .collect();

    // Filter out failed steps and steps with future startDate
    const steps = allSteps.filter(step => {
      // Filter out failed steps
      if (step.failed ?? false) return false;
      // Filter out steps with startDate in the future
      if (step.startDate && step.startDate > startOfToday) return false;
      return true;
    });

    // Sort by sortOrder (ascending) with fallback to createdAt
    const sortedSteps = steps.sort((a, b) => {
      const orderA = a.sortOrder ?? a.createdAt;
      const orderB = b.sortOrder ?? b.createdAt;
      return orderA - orderB;
    });

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      sortedSteps.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

export const getUpcomingSteps = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    // Get start of today for startDate comparison
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const allSteps = await ctx.db
      .query("steps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), false))
      .order("desc")
      .collect();

    // Filter for steps with future startDate
    const steps = allSteps.filter(step => {
      // Filter out failed steps
      if (step.failed ?? false) return false;
      // Only include steps with startDate in the future
      if (!step.startDate || step.startDate <= startOfToday) return false;
      return true;
    });

    // Sort by startDate ascending (soonest first)
    const sortedSteps = steps.sort((a, b) => {
      return (a.startDate ?? 0) - (b.startDate ?? 0);
    });

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      sortedSteps.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

export const getCompletedStepsToday = query({
  args: {
    startOfDayTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    // Use provided timestamp (from user's timezone) or calculate in server timezone as fallback
    let startOfTodayTimestamp: number;
    if (args.startOfDayTimestamp !== undefined) {
      startOfTodayTimestamp = args.startOfDayTimestamp;
    } else {
      const now = Date.now();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      startOfTodayTimestamp = startOfToday.getTime();
    }

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.gte(q.field("completedAt"), startOfTodayTimestamp)
        )
      )
      .order("desc")
      .collect();

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      steps.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

export const getFailedSteps = query({
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const allSteps = await ctx.db
      .query("steps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Filter for failed steps (handle undefined as false for backward compatibility)
    const steps = allSteps.filter(step => step.failed === true);

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      steps.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

export const getChildSteps = query({
  args: { parentId: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const children = await ctx.db
      .query("steps")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();

    // Filter to only this user's children
    const ownedChildren = children.filter(c => c.userId === userId);

    // Sort by sortOrder (ascending) with fallback to createdAt
    const sortedChildren = ownedChildren.sort((a, b) => {
      const orderA = a.sortOrder ?? a.createdAt;
      const orderB = b.sortOrder ?? b.createdAt;
      return orderA - orderB;
    });

    // Populate pathId references
    const stepsWithPaths = await Promise.all(
      sortedChildren.map(async (step) => {
        if (step.pathId) {
          const path = await ctx.db.get(step.pathId);
          return { ...step, path };
        }
        return { ...step, path: null };
      })
    );

    return stepsWithPaths;
  },
});

// Mutations
export const createStep = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    pathId: v.optional(v.id("paths")),
    parentId: v.optional(v.id("steps")),
    routineId: v.optional(v.id("routines")),
    prioritizedToday: v.optional(v.boolean()),
    dueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Routine spawn idempotency: the server cron and the client-side spawner
    // can both try to create today's step for the same routine. Before inserting,
    // return any existing step for this routine created today so the caller
    // converges onto a single server id.
    if (args.routineId) {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();

      const existing = await ctx.db
        .query("steps")
        .withIndex("by_routine", (q) => q.eq("routineId", args.routineId))
        .filter((q) => q.gte(q.field("createdAt"), startOfTodayMs))
        .first();

      if (existing && existing.userId === userId) {
        if (existing.pathId) {
          const path = await ctx.db.get(existing.pathId);
          return { ...existing, path };
        }
        return { ...existing, path: null };
      }
    }

    // If parentId is provided, validate it exists and is not itself a child (enforce 1 level)
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.userId !== userId) throw new Error("Parent step not found");
      if (parent.parentId) throw new Error("Cannot nest more than 1 level deep");
    }

    // Get steps to determine sortOrder - scoped to parent context
    let siblingSteps;
    if (args.parentId) {
      // Get children of the same parent
      siblingSteps = await ctx.db
        .query("steps")
        .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
        .filter((q) => q.eq(q.field("completed"), false))
        .collect();
    } else {
      // Get root-level active steps (no parent)
      const allActiveSteps = await ctx.db
        .query("steps")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("completed"), false))
        .collect();
      siblingSteps = allActiveSteps.filter((s) => !s.parentId);
    }

    // Find the minimum sortOrder (or use 0 if no steps exist)
    const minSortOrder = siblingSteps.reduce((min, step) => {
      const order = step.sortOrder ?? step.createdAt;
      return Math.min(min, order);
    }, now);

    // Set new step's sortOrder to be lower than the minimum
    const newSortOrder = minSortOrder - 1;

    const stepId = await ctx.db.insert("steps", {
      userId,
      title: args.title,
      description: args.description,
      completed: false,
      failed: false,
      pathId: args.pathId,
      parentId: args.parentId,
      routineId: args.routineId,
      prioritizedToday: args.prioritizedToday || false,
      sortOrder: newSortOrder,
      dueDate: args.dueDate,
      startDate: args.startDate,
      createdAt: now,
      updatedAt: now,
    });

    const step = await ctx.db.get(stepId);
    if (!step) throw new Error("Failed to create step");

    if (step.pathId) {
      const path = await ctx.db.get(step.pathId);
      return { ...step, path };
    }

    return { ...step, path: null };
  },
});

export const updateStep = mutation({
  args: {
    id: v.id("steps"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    failed: v.optional(v.boolean()),
    pathId: v.optional(v.union(v.id("paths"), v.null())),
    prioritizedToday: v.optional(v.boolean()),
    dueDate: v.optional(v.union(v.number(), v.null())),
    startDate: v.optional(v.union(v.number(), v.null())),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Step not found");

    const now = Date.now();
    const patchData: any = {
      ...updates,
      updatedAt: now,
    };

    // Only include pathId if it was explicitly provided in the updates
    if ('pathId' in updates) {
      patchData.pathId = updates.pathId === null ? undefined : updates.pathId;
    }

    // Handle dueDate (allow null to clear)
    if ('dueDate' in updates) {
      patchData.dueDate = updates.dueDate === null ? undefined : updates.dueDate;
    }

    // Handle startDate (allow null to clear)
    if ('startDate' in updates) {
      patchData.startDate = updates.startDate === null ? undefined : updates.startDate;
    }

    // Handle completedAt when completed status changes
    if ('completed' in updates && updates.completed !== undefined) {
      if (updates.completed && !existing.completed) {
        // Marking as completed - also clear failed state
        patchData.completedAt = now;
        patchData.failed = false;
        patchData.failedAt = undefined;
      } else if (!updates.completed && existing.completed) {
        // Marking as incomplete
        patchData.completedAt = undefined;
      }
    }

    // Handle failedAt when failed status changes
    if ('failed' in updates && updates.failed !== undefined) {
      const currentFailedState = existing.failed ?? false;
      if (updates.failed && !currentFailedState) {
        // Marking as failed
        patchData.failedAt = now;
      } else if (!updates.failed && currentFailedState) {
        // Marking as not failed
        patchData.failedAt = undefined;
      }
    }

    // Handle archived fields
    if ('archived' in updates && updates.archived !== undefined) {
      patchData.archived = updates.archived;
    }
    if ('archivedAt' in updates) {
      patchData.archivedAt = updates.archivedAt === null ? undefined : updates.archivedAt;
    }

    await ctx.db.patch(id, patchData);

    const step = await ctx.db.get(id);
    if (!step) throw new Error("Failed to update step");

    if (step.pathId) {
      const path = await ctx.db.get(step.pathId);
      return { ...step, path };
    }

    return { ...step, path: null };
  },
});

export const deleteStep = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Not found");

    // Cascade delete: delete all children first
    const children = await ctx.db
      .query("steps")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const child of children) {
      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(args.id);
    return { success: true, message: "Step deleted successfully" };
  },
});

export const toggleStepCompletion = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    const now = Date.now();
    const newCompletedState = !step.completed;

    await ctx.db.patch(args.id, {
      completed: newCompletedState,
      completedAt: newCompletedState ? now : undefined,
      failed: false,
      failedAt: undefined,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to toggle step");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});

export const toggleStepFailed = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    const now = Date.now();
    // Handle undefined as false for backward compatibility
    const currentFailedState = step.failed ?? false;
    const newFailedState = !currentFailedState;

    await ctx.db.patch(args.id, {
      failed: newFailedState,
      failedAt: newFailedState ? now : undefined,
      completed: false,
      completedAt: undefined,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to toggle step failed state");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});

export const reorderSteps = mutation({
  args: {
    stepIds: v.array(v.id("steps")),
    parentId: v.optional(v.id("steps")),
  },
  handler: async (ctx, { stepIds, parentId }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Update sortOrder for each step based on position in array
    // Also ensure they all have the correct parentId
    await Promise.all(
      stepIds.map(async (stepId, index) => {
        const step = await ctx.db.get(stepId);
        if (!step || step.userId !== userId) throw new Error("Not found");
        return ctx.db.patch(stepId, {
          sortOrder: index,
          parentId: parentId,
          updatedAt: now,
        });
      })
    );

    return { success: true };
  },
});

export const updateStepParent = mutation({
  args: {
    id: v.id("steps"),
    parentId: v.optional(v.id("steps")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    // Validate new parent if provided
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.userId !== userId) throw new Error("Parent step not found");
      if (parent.parentId) throw new Error("Cannot nest more than 1 level deep");
      // Prevent circular reference
      if (args.parentId === args.id) throw new Error("Step cannot be its own parent");
    }

    // If this step has children and we're trying to make it a child, prevent it
    if (args.parentId) {
      const existingChildren = await ctx.db
        .query("steps")
        .withIndex("by_parent", (q) => q.eq("parentId", args.id))
        .collect();
      if (existingChildren.length > 0) {
        throw new Error("Cannot nest a step that has children");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      parentId: args.parentId,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to update step parent");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});

// Timer mutations
export const startTimer = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      timerStartedAt: now,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to start timer");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});

export const setTotalTime = mutation({
  args: {
    id: v.id("steps"),
    totalTimeSpentMs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    const totalTimeSpentMs = Math.max(0, args.totalTimeSpentMs);
    const now = Date.now();

    await ctx.db.patch(args.id, {
      // 0 clears the field (back to default — no time tracked)
      totalTimeSpentMs: totalTimeSpentMs === 0 ? undefined : totalTimeSpentMs,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to set total time");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});

export const stopTimer = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const step = await ctx.db.get(args.id);
    if (!step || step.userId !== userId) throw new Error("Step not found");

    const now = Date.now();

    // Calculate elapsed time from current session
    const elapsed = step.timerStartedAt ? now - step.timerStartedAt : 0;
    const newTotal = (step.totalTimeSpentMs || 0) + elapsed;

    await ctx.db.patch(args.id, {
      timerStartedAt: undefined,
      totalTimeSpentMs: newTotal,
      updatedAt: now,
    });

    const updatedStep = await ctx.db.get(args.id);
    if (!updatedStep) throw new Error("Failed to stop timer");

    if (updatedStep.pathId) {
      const path = await ctx.db.get(updatedStep.pathId);
      return { ...updatedStep, path };
    }

    return { ...updatedStep, path: null };
  },
});
