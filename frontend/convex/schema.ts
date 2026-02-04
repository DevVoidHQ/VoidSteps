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
    parentId: v.optional(v.id("paths")),           // Self-ref for hierarchy
    connectedPathIds: v.optional(v.array(v.id("paths"))), // Path-to-Path connections
    connectedStepIds: v.optional(v.array(v.id("steps"))), // Path-to-Step connections
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_parent", ["parentId"]),

  // Routines are blueprints that spawn steps on a schedule
  routines: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    pathId: v.optional(v.id("paths")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekdays"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    ),
    // For weekly: which days (0=Sun, 1=Mon, ..., 6=Sat)
    daysOfWeek: v.optional(v.array(v.number())),
    // For monthly: which day of month (1-31)
    dayOfMonth: v.optional(v.number()),
    // For yearly: which month (1-12) and day (1-31)
    month: v.optional(v.number()),
    dayOfYear: v.optional(v.number()),
    // Next scheduled occurrence timestamp
    nextOccurrence: v.number(),
    // Whether to auto-prioritize spawned steps
    autoPrioritize: v.optional(v.boolean()),
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
    // For steps spawned from a routine, track the source
    routineId: v.optional(v.id("routines")),
    prioritizedToday: v.boolean(),
    sortOrder: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    // Timer fields
    timerStartedAt: v.optional(v.number()),   // Current session start (null = not timing)
    totalTimeSpentMs: v.optional(v.number()), // Cumulative time across sessions
    createdAt: v.number(),
    updatedAt: v.number(),
    // TEMPORARY: Legacy fields to be removed after migration
    recurring: v.optional(v.any()),
    recurringSourceId: v.optional(v.any()),
  }).index("by_path", ["pathId"])
    .index("by_parent", ["parentId"])
    .index("by_routine", ["routineId"]),

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
