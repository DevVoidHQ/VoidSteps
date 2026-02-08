/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as migrations from "../migrations.js";
import type * as migrations_migratePathwaysToPaths from "../migrations/migratePathwaysToPaths.js";
import type * as paths from "../paths.js";
import type * as pathways from "../pathways.js";
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
  crons: typeof crons;
  migrations: typeof migrations;
  "migrations/migratePathwaysToPaths": typeof migrations_migratePathwaysToPaths;
  paths: typeof paths;
  pathways: typeof pathways;
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
