import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pathways: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("pathways")),
    pathIds: v.optional(v.array(v.id("paths"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_parent", ["parentId"]),

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
    completedAt: v.optional(v.number()),
    failed: v.optional(v.boolean()),
    failedAt: v.optional(v.number()),
    pathId: v.optional(v.id("paths")),
    parentId: v.optional(v.id("steps")),
    routineId: v.optional(v.id("routines")),
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
    sortOrder: v.optional(v.number()),
    dueDate: v.optional(v.number()),    // Reminder deadline (timestamp)
    startDate: v.optional(v.number()),  // Don't show until this date (timestamp)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_path", ["pathId"])
    .index("by_parent", ["parentId"]),

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

  userSettings: defineTable({
    userId: v.id("users"),
    theme: v.object({
      background: v.string(),
      foreground: v.string(),
      card: v.string(),
      cardForeground: v.string(),
      popover: v.string(),
      popoverForeground: v.string(),
      primary: v.string(),
      primaryForeground: v.string(),
      secondary: v.string(),
      secondaryForeground: v.string(),
      muted: v.string(),
      mutedForeground: v.string(),
      accent: v.string(),
      accentForeground: v.string(),
      destructive: v.string(),
      destructiveForeground: v.string(),
      border: v.string(),
      input: v.string(),
      ring: v.string(),
    }),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
