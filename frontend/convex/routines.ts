import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const stepTemplateValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  pathId: v.optional(v.id("paths")),
  prioritizedToday: v.optional(v.boolean()),
});

// Queries
export const getRoutines = query({
  handler: async (ctx) => {
    return await ctx.db.query("routines").order("desc").collect();
  },
});

export const getRoutine = query({
  args: { id: v.id("routines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutations
export const createRoutine = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    stepTemplates: v.array(stepTemplateValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const routineId = await ctx.db.insert("routines", {
      title: args.title,
      description: args.description,
      stepTemplates: args.stepTemplates,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(routineId);
  },
});

export const updateRoutine = mutation({
  args: {
    id: v.id("routines"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    stepTemplates: v.optional(v.array(stepTemplateValidator)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Routine not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deleteRoutine = mutation({
  args: { id: v.id("routines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true, message: "Routine deleted successfully" };
  },
});

// Execute a routine - creates steps from step templates
export const executeRoutine = mutation({
  args: { id: v.id("routines") },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.id);
    if (!routine) throw new Error("Routine not found");

    const now = Date.now();
    const createdSteps = [];

    for (const template of routine.stepTemplates) {
      const stepId = await ctx.db.insert("steps", {
        title: template.title,
        description: template.description,
        completed: false,
        failed: false,
        pathId: template.pathId,
        recurring: {
          enabled: false,
        },
        prioritizedToday: template.prioritizedToday || false,
        createdAt: now,
        updatedAt: now,
      });

      const step = await ctx.db.get(stepId);
      if (step) {
        createdSteps.push(step);
      }
    }

    return { success: true, steps: createdSteps };
  },
});
