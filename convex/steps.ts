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

    await ctx.db.patch(id, {
      ...updates,
      pathId: updates.pathId === null ? undefined : updates.pathId,
      updatedAt: Date.now(),
    });

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

    await ctx.db.patch(args.id, {
      completed: !step.completed,
      updatedAt: Date.now(),
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
