import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const getSteps = query({
  handler: async (ctx) => {
    const steps = await ctx.db.query("steps").order("desc").collect();

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
    const step = await ctx.db.get(args.id);
    if (!step) return null;

    if (step.pathId) {
      const path = await ctx.db.get(step.pathId);
      return { ...step, path };
    }

    return { ...step, path: null };
  },
});

export const getActiveSteps = query({
  handler: async (ctx) => {
    const allSteps = await ctx.db
      .query("steps")
      .filter((q) => q.eq(q.field("completed"), false))
      .order("desc")
      .collect();

    // Filter out failed steps (handle undefined as false for backward compatibility)
    const steps = allSteps.filter(step => !(step.failed ?? false));

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

export const getCompletedStepsToday = query({
  args: {
    startOfDayTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
    const allSteps = await ctx.db
      .query("steps")
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

// Mutations
export const createStep = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    pathId: v.optional(v.id("paths")),
    recurring: v.optional(
      v.object({
        enabled: v.boolean(),
        frequency: v.optional(
          v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("yearly")
          )
        ),
        interval: v.optional(v.number()),
        nextOccurrence: v.optional(v.number()),
      })
    ),
    prioritizedToday: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const stepId = await ctx.db.insert("steps", {
      title: args.title,
      description: args.description,
      completed: false,
      failed: false,
      pathId: args.pathId,
      recurring: args.recurring || {
        enabled: false,
        frequency: undefined,
        interval: 1,
        nextOccurrence: undefined,
      },
      prioritizedToday: args.prioritizedToday || false,
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
    recurring: v.optional(
      v.object({
        enabled: v.boolean(),
        frequency: v.optional(
          v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("monthly"),
            v.literal("yearly")
          )
        ),
        interval: v.optional(v.number()),
        nextOccurrence: v.optional(v.number()),
      })
    ),
    prioritizedToday: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Step not found");

    const now = Date.now();
    const patchData: any = {
      ...updates,
      updatedAt: now,
    };

    // Only include pathId if it was explicitly provided in the updates
    if ('pathId' in updates) {
      patchData.pathId = updates.pathId === null ? undefined : updates.pathId;
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
    await ctx.db.delete(args.id);
    return { success: true, message: "Step deleted successfully" };
  },
});

export const toggleStepCompletion = mutation({
  args: { id: v.id("steps") },
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.id);
    if (!step) throw new Error("Step not found");

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
    const step = await ctx.db.get(args.id);
    if (!step) throw new Error("Step not found");

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
