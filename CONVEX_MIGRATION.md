# Convex Migration Guide

This document outlines the Convex backend setup and how to complete the frontend migration.

## What's Been Done

### 1. Backend Setup
- ✅ Installed Convex packages
- ✅ Created Convex schema (`convex/schema.ts`) with tables for:
  - Steps (with recurring support, priority, path relationships)
  - Paths
  - Routines (with step templates)
  - Users
- ✅ Created Convex functions:
  - **Steps**: `getSteps`, `getStep`, `createStep`, `updateStep`, `deleteStep`, `toggleStepCompletion`
  - **Paths**: `getPaths`, `getPath`, `createPath`, `updatePath`, `deletePath`
  - **Routines**: `getRoutines`, `getRoutine`, `createRoutine`, `updateRoutine`, `deleteRoutine`, `executeRoutine`
  - **Auth**: `login`, `verify`

### 2. Frontend Setup
- ✅ Installed Convex React package
- ✅ Configured ConvexProvider in `main.tsx`
- ✅ Created helper hooks in `src/lib/convex-hooks.ts`
- ✅ Added `VITE_CONVEX_URL` to `.env`

## Completed Setup

✅ All backend and frontend code has been migrated to use Convex
✅ Data migration script created

## Next Steps

### 1. Install Dependencies

From the project root, install the required packages:

```bash
npm install
```

### 2. Initialize Convex Project

Run this command from the project root:

```bash
npm run convex:dev
```

This will:
- Create a Convex deployment
- Generate TypeScript types
- Give you a deployment URL
- Start watching for changes

When prompted, follow the instructions to sign up/login to Convex and create a deployment.

### 2. Update Environment Variables

After running `convex:dev`, copy the deployment URL and add it to `frontend/.env`:

```env
VITE_CONVEX_URL=https://your-deployment-url.convex.cloud
```

### 3. Set Environment Variables in Convex Dashboard

Your auth currently uses environment variables. Set these in the Convex dashboard:
- `USER_EMAIL`: Your login email
- `USER_PASSWORD`: Your login password

Go to: https://dashboard.convex.dev → Your Project → Settings → Environment Variables

### 4. Migrate Existing Data from MongoDB

**IMPORTANT**: The frontend and backend have been fully migrated to use Convex. To transfer your existing MongoDB data to Convex, use the migration script.

#### Dry Run (Preview Only)

First, run a dry run to see what would be migrated:

```bash
npm run migrate:convex
```

This will show you:
- How many paths, steps, and routines will be migrated
- Any potential issues (like references to missing paths)
- No actual data will be changed

#### Perform the Migration

Once you're happy with the dry run results, perform the actual migration:

```bash
npm run migrate:convex --apply
```

This will:
1. Connect to your MongoDB database
2. Fetch all paths, steps, and routines
3. Transform the data for Convex (convert dates, IDs, etc.)
4. Insert into Convex in the correct order:
   - Paths first (to get new IDs)
   - Steps (with updated path references)
   - Routines (with updated path references)
5. Preserve all data:
   - Completion status
   - Priority flags
   - Recurring settings
   - Descriptions and metadata
   - Creation/update timestamps

**Note**: Make sure your MongoDB backend is running and accessible before running the migration.

### 5. Start the Frontend

The frontend has been fully migrated to use Convex! The old backend code remains in `backend/` directory untouched.

To start using the app with Convex:

```bash
cd frontend
pnpm dev
```

Your app will now:
- Use Convex for all data operations
- Get real-time updates automatically
- Have fully type-safe API calls

#### How the Frontend Was Migrated

All API calls have been converted from Axios to Convex hooks. Here's the pattern used:

**Before (using Axios):**
```typescript
const [steps, setSteps] = useState<Step[]>([]);

useEffect(() => {
  fetchSteps();
}, []);

const fetchSteps = async () => {
  const res = await api.get("/steps");
  setSteps(res.data);
};

const createStep = async (title: string) => {
  await api.post("/steps", { title });
  fetchSteps();
};

const deleteStep = async (id: string) => {
  await api.delete(`/steps/${id}`);
  fetchSteps();
};
```

**After (using Convex):**
```typescript
import { useSteps, useCreateStep, useDeleteStep } from "@/lib/convex-hooks";

// Query automatically subscribes to changes - real-time updates!
const steps = useSteps(); // Returns Step[] | undefined

// Mutations
const createStepMutation = useCreateStep();
const deleteStepMutation = useDeleteStep();

const createStep = async (title: string) => {
  await createStepMutation({
    title,
    description: "",
    prioritizedToday: false
  });
  // No need to refetch - the query auto-updates!
};

const deleteStep = async (id: Id<"steps">) => {
  await deleteStepMutation({ id });
  // No need to refetch - the query auto-updates!
};

// Handle loading state
if (steps === undefined) return <div>Loading...</div>;
```

#### Key Differences:

1. **Queries are Reactive**: `useQuery` hooks automatically re-run when data changes
2. **No Manual Refetching**: Mutations automatically trigger query updates
3. **Real-time**: Multiple clients see updates instantly
4. **Type-Safe**: Full TypeScript support with generated types
5. **Optimistic Updates**: Built-in support for immediate UI updates

### 6. Benefits of Convex You'll Experience

1. **Real-time updates** - Multiple tabs/users see changes instantly
2. **No backend server to manage** - Convex handles deployment
3. **Type-safe** - Auto-generated TypeScript types
4. **Reactive** - UI updates automatically when data changes
5. **Built-in auth** - Can upgrade to Convex Auth later for more features
6. **File storage** - Can add file uploads easily
7. **Scheduled functions** - Run cron jobs natively
8. **Full-text search** - Built-in search capabilities

## What's Been Completed

### ✅ Backend (Convex)
- Complete schema with all tables (Steps, Paths, Routines, Users)
- All CRUD operations implemented as Convex functions
- Auth system matching your current setup
- Special `executeRoutine` function for instantiating routines

### ✅ Frontend
- All components migrated to use Convex hooks
- AuthContext updated for Convex auth
- Dashboard fully converted (no more manual refetching!)
- Type-safe hooks in `src/lib/convex-hooks.ts`
- ConvexProvider configured in main.tsx

### ✅ Migration Script
- Automated MongoDB → Convex migration
- Dry run capability to preview changes
- Preserves all data and relationships
- Handles ID mapping automatically

## Keeping the Old Backend

The Express/MongoDB backend in `backend/` remains unchanged. You can:
- Keep it running alongside Convex during testing
- Use it as a backup
- Delete it once you're satisfied with Convex

## Quick Start

1. `npm install` - Install dependencies
2. `npm run convex:dev` - Initialize Convex and get deployment URL
3. Add `VITE_CONVEX_URL` to `frontend/.env`
4. Set `USER_EMAIL` and `USER_PASSWORD` in Convex dashboard
5. `npm run migrate:convex` - Preview data migration (dry run)
6. `npm run migrate:convex --apply` - Migrate your data
7. `cd frontend && pnpm dev` - Start the app!

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [Convex React Quickstart](https://docs.convex.dev/quickstart/react)
- [Convex Dashboard](https://dashboard.convex.dev/)
