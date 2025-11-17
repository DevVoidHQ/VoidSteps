import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  paths: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  steps: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    pathId: v.optional(v.id("paths")),
    recurring: v.object({
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
    }),
    prioritizedToday: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_path", ["pathId"]),

  routines: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    stepTemplates: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        pathId: v.optional(v.id("paths")),
        prioritizedToday: v.optional(v.boolean()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
  }).index("by_email", ["email"]),
});
