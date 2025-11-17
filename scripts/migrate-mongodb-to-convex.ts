/**
 * MongoDB to Convex Migration Script
 *
 * This script migrates all existing data from MongoDB to Convex.
 *
 * Usage:
 *   npm run migrate:convex           # Dry run (preview only)
 *   npm run migrate:convex --apply   # Actually perform the migration
 */

import mongoose from "mongoose";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../frontend/convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

// Load backend environment variables
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

interface MigrationStats {
  paths: { total: number; migrated: number; failed: number };
  steps: { total: number; migrated: number; failed: number };
  routines: { total: number; migrated: number; failed: number };
}

const stats: MigrationStats = {
  paths: { total: 0, migrated: 0, failed: 0 },
  steps: { total: 0, migrated: 0, failed: 0 },
  routines: { total: 0, migrated: 0, failed: 0 },
};

async function connectToMongoDB(): Promise<void> {
  const mongoUri =
    "mongodb+srv://aneeshbhat:WQzTk1FIL41tuyUP@test.iugzhsc.mongodb.net/prod";

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGODB_URL not found in backend/.env");
  }

  console.log("🔌 Connecting to MongoDB...", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");
}

function getConvexClient(): ConvexHttpClient {
  // Get Convex URL from frontend .env
  dotenv.config({ path: path.join(__dirname, "../frontend/.env") });
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL not found in frontend/.env");
  }

  console.log("🔌 Connecting to Convex...");
  const client = new ConvexHttpClient(convexUrl);
  console.log("✅ Connected to Convex\n");

  return client;
}

async function migratePaths(
  client: ConvexHttpClient,
  dryRun: boolean
): Promise<Map<string, string>> {
  console.log("📂 Migrating Paths...");

  const paths = await mongoose.connection
    .collection("paths")
    .find({})
    .toArray();
  stats.paths.total = paths.length;

  console.log(`   Found ${paths.length} paths in MongoDB`);

  const pathIdMap = new Map<string, string>(); // Map old MongoDB ID to new Convex ID

  for (const path of paths) {
    try {
      const pathData = {
        title: path.title,
        description: path.description || "",
      };

      if (dryRun) {
        console.log(`   [DRY RUN] Would create path: "${path.title}"`);
        // In dry run, use fake IDs
        pathIdMap.set(path._id.toString(), `fake_path_${path._id.toString()}`);
        stats.paths.migrated++;
      } else {
        const newPath = await client.mutation(api.paths.createPath, pathData);
        if (newPath) {
          pathIdMap.set(path._id.toString(), newPath._id);
          stats.paths.migrated++;
          console.log(
            `   ✓ Migrated path: "${path.title}" (${path._id} → ${newPath._id})`
          );
        }
      }
    } catch (error) {
      stats.paths.failed++;
      console.error(`   ✗ Failed to migrate path "${path.title}":`, error);
    }
  }

  console.log(
    `\n   ✅ Paths: ${stats.paths.migrated} migrated, ${stats.paths.failed} failed\n`
  );
  return pathIdMap;
}

async function migrateSteps(
  client: ConvexHttpClient,
  pathIdMap: Map<string, string>,
  dryRun: boolean
): Promise<void> {
  console.log("📝 Migrating Steps...");

  const steps = await mongoose.connection
    .collection("steps")
    .find({})
    .toArray();
  stats.steps.total = steps.length;

  console.log(`   Found ${steps.length} steps in MongoDB`);

  for (const step of steps) {
    try {
      // Map old path ID to new Convex path ID
      let newPathId: string | undefined = undefined;
      if (step.pathId) {
        const oldPathId = step.pathId.toString();
        newPathId = pathIdMap.get(oldPathId);

        if (!newPathId) {
          console.warn(
            `   ⚠ Step "${step.title}" references unknown path ${oldPathId}`
          );
        }
      }

      const stepData: any = {
        title: step.title,
        description: step.description || "",
        pathId: newPathId,
        prioritizedToday: step.prioritizedToday || false,
        recurring: {
          enabled: step.recurring?.enabled || false,
          frequency: step.recurring?.frequency || undefined,
          interval: step.recurring?.interval || 1,
          nextOccurrence: step.recurring?.nextOccurrence
            ? new Date(step.recurring.nextOccurrence).getTime()
            : undefined,
        },
      };

      if (dryRun) {
        console.log(
          `   [DRY RUN] Would create step: "${step.title}" ${step.completed ? "(completed)" : "(incomplete)"}`
        );
        stats.steps.migrated++;
      } else {
        const newStep = await client.mutation(api.steps.createStep, stepData);

        // If step was completed in MongoDB, mark it as completed in Convex
        if (step.completed && newStep) {
          await client.mutation(api.steps.updateStep, {
            id: newStep._id,
            completed: true,
          });
        }

        if (newStep) {
          stats.steps.migrated++;
          console.log(
            `   ✓ Migrated step: "${step.title}" (${step._id} → ${newStep._id})`
          );
        }
      }
    } catch (error) {
      stats.steps.failed++;
      console.error(`   ✗ Failed to migrate step "${step.title}":`, error);
    }
  }

  console.log(
    `\n   ✅ Steps: ${stats.steps.migrated} migrated, ${stats.steps.failed} failed\n`
  );
}

async function migrateRoutines(
  client: ConvexHttpClient,
  pathIdMap: Map<string, string>,
  dryRun: boolean
): Promise<void> {
  console.log("⚡ Migrating Routines...");

  const routines = await mongoose.connection
    .collection("routines")
    .find({})
    .toArray();
  stats.routines.total = routines.length;

  console.log(`   Found ${routines.length} routines in MongoDB`);

  for (const routine of routines) {
    try {
      // Map step template path IDs
      const stepTemplates = routine.stepTemplates.map((template: any) => {
        let newPathId: string | undefined = undefined;

        if (template.pathId) {
          const oldPathId = template.pathId.toString();
          newPathId = pathIdMap.get(oldPathId);

          if (!newPathId) {
            console.warn(
              `   ⚠ Routine "${routine.title}" references unknown path ${oldPathId}`
            );
          }
        }

        return {
          title: template.title,
          description: template.description || "",
          pathId: newPathId as any, // Type cast for Convex ID
          prioritizedToday: template.prioritizedToday || false,
        };
      });

      const routineData = {
        title: routine.title,
        description: routine.description || "",
        stepTemplates,
      };

      if (dryRun) {
        console.log(
          `   [DRY RUN] Would create routine: "${routine.title}" (${routine.stepTemplates.length} steps)`
        );
        stats.routines.migrated++;
      } else {
        const newRoutine = await client.mutation(
          api.routines.createRoutine,
          routineData
        );
        if (newRoutine) {
          stats.routines.migrated++;
          console.log(
            `   ✓ Migrated routine: "${routine.title}" (${routine._id} → ${newRoutine._id})`
          );
        }
      }
    } catch (error) {
      stats.routines.failed++;
      console.error(
        `   ✗ Failed to migrate routine "${routine.title}":`,
        error
      );
    }
  }

  console.log(
    `\n   ✅ Routines: ${stats.routines.migrated} migrated, ${stats.routines.failed} failed\n`
  );
}

function printSummary(dryRun: boolean): void {
  console.log("\n" + "=".repeat(60));
  console.log(dryRun ? "📋 DRY RUN SUMMARY" : "📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));

  console.log(
    `\n📂 Paths:     ${stats.paths.migrated}/${stats.paths.total} ${dryRun ? "would be" : ""} migrated`
  );
  if (stats.paths.failed > 0) {
    console.log(`             ${stats.paths.failed} failed`);
  }

  console.log(
    `\n📝 Steps:     ${stats.steps.migrated}/${stats.steps.total} ${dryRun ? "would be" : ""} migrated`
  );
  if (stats.steps.failed > 0) {
    console.log(`             ${stats.steps.failed} failed`);
  }

  console.log(
    `\n⚡ Routines:  ${stats.routines.migrated}/${stats.routines.total} ${dryRun ? "would be" : ""} migrated`
  );
  if (stats.routines.failed > 0) {
    console.log(`             ${stats.routines.failed} failed`);
  }

  const totalMigrated =
    stats.paths.migrated + stats.steps.migrated + stats.routines.migrated;
  const totalFailed =
    stats.paths.failed + stats.steps.failed + stats.routines.failed;
  const totalItems =
    stats.paths.total + stats.steps.total + stats.routines.total;

  console.log(
    `\n📊 Total:     ${totalMigrated}/${totalItems} ${dryRun ? "would be" : ""} migrated`
  );
  if (totalFailed > 0) {
    console.log(`             ${totalFailed} failed`);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  if (dryRun) {
    console.log("💡 This was a dry run. No data was actually migrated.");
    console.log(
      "   To perform the actual migration, run: npm run migrate:convex --apply\n"
    );
  } else {
    console.log("✅ Migration complete!\n");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  console.log("\n" + "=".repeat(60));
  console.log("🚀 MongoDB to Convex Migration Script");
  console.log("=".repeat(60) + "\n");

  if (dryRun) {
    console.log("⚠️  DRY RUN MODE - No changes will be made\n");
  } else {
    console.log("⚠️  LIVE MODE - Changes will be applied!\n");
  }

  try {
    // Connect to both databases
    await connectToMongoDB();
    const client = getConvexClient();

    // Perform migration
    const pathIdMap = await migratePaths(client, dryRun);
    await migrateSteps(client, pathIdMap, dryRun);
    await migrateRoutines(client, pathIdMap, dryRun);

    // Print summary
    printSummary(dryRun);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB\n");
  }
}

main();
