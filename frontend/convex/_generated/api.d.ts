/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as batch from "../batch.js";
import type * as crons from "../crons.js";
import type * as feedback from "../feedback.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dbHelpers from "../lib/dbHelpers.js";
import type * as lib_recurrence from "../lib/recurrence.js";
import type * as migrations from "../migrations.js";
import type * as migrations_deleteLegacyPathways from "../migrations/deleteLegacyPathways.js";
import type * as notebooks from "../notebooks.js";
import type * as notes from "../notes.js";
import type * as paths from "../paths.js";
import type * as reminders from "../reminders.js";
import type * as routineSpawner from "../routineSpawner.js";
import type * as routines from "../routines.js";
import type * as steps from "../steps.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  batch: typeof batch;
  crons: typeof crons;
  feedback: typeof feedback;
  "lib/admin": typeof lib_admin;
  "lib/auth": typeof lib_auth;
  "lib/dbHelpers": typeof lib_dbHelpers;
  "lib/recurrence": typeof lib_recurrence;
  migrations: typeof migrations;
  "migrations/deleteLegacyPathways": typeof migrations_deleteLegacyPathways;
  notebooks: typeof notebooks;
  notes: typeof notes;
  paths: typeof paths;
  reminders: typeof reminders;
  routineSpawner: typeof routineSpawner;
  routines: typeof routines;
  steps: typeof steps;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
