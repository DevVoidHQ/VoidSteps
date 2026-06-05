import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  paths: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("paths")),           // Self-ref for hierarchy
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_parent", ["parentId"]),

  // Routines are blueprints that spawn steps on a schedule
  routines: defineTable({
    userId: v.optional(v.string()),
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
  }).index("by_user", ["userId"]),

  // Reminders: passive date markers (birthdays, anniversaries, holidays). No
  // completion or steps - they only surface on the calendar.
  reminders: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    note: v.optional(v.string()),
    recurrence: v.union(
      v.literal("once"),
      v.literal("yearly"),
      v.literal("monthly")
    ),
    // once: start-of-day timestamp of the exact date
    date: v.optional(v.number()),
    // yearly: month (1-12) + day (1-31); monthly: day (1-31)
    month: v.optional(v.number()),
    day: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  steps: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    failed: v.optional(v.boolean()),
    failedAt: v.optional(v.number()),
    pathId: v.optional(v.id("paths")),
    // For steps spawned from a routine, track the source
    routineId: v.optional(v.id("routines")),
    prioritizedToday: v.boolean(),
    sortOrder: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    // Timer fields
    timerStartedAt: v.optional(v.number()),   // Current session start (null = not timing)
    totalTimeSpentMs: v.optional(v.number()), // Cumulative time across sessions
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // TEMPORARY: Legacy fields to be removed after migration
    recurring: v.optional(v.any()),
    recurringSourceId: v.optional(v.any()),
    // Deprecated: sub-steps removed. Kept optional so existing docs validate;
    // nothing writes it anymore.
    parentId: v.optional(v.id("steps")),
  }).index("by_user", ["userId"])
    .index("by_path", ["pathId"])
    .index("by_routine", ["routineId"]),

  // Notebooks - top-level container for notes. 2-level hierarchy: notebooks → notes.
  notebooks: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Notes - markdown content inside a notebook.
  notes: defineTable({
    userId: v.optional(v.string()),
    notebookId: v.id("notebooks"),
    title: v.string(),
    body: v.string(), // markdown
    sortOrder: v.optional(v.number()),
    archived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_notebook", ["notebookId"]),

  // Maps a client-generated create id (the local_ tempId) to the server id it
  // produced, so a create that is sent more than once (two tabs racing the same
  // shared queue, a batch retry, or a lost network ack) returns the existing
  // row instead of inserting a duplicate. Keyed per user.
  syncIdempotency: defineTable({
    userId: v.string(),
    clientId: v.string(), // the local_ tempId the client minted for the create
    table: v.string(),
    serverId: v.string(),
    createdAt: v.number(),
  }).index("by_user_client", ["userId", "clientId"]),

  userSettings: defineTable({
    userId: v.string(),
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
