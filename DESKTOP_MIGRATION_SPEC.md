# VoidSteps Desktop: Convex removal and Tauri packaging

_Spec drafted 2026-08-26. Supersedes PRICING_STRATEGY.md for the MVP._

## Goal

Ship VoidSteps as a free, fully local, installable desktop app (macOS `.dmg`,
Windows `.exe`). No accounts, no server, no tiers, every feature unlocked.
Cloud sync returns later as a paid add-on, and nothing in this migration may
make that return expensive.

## Decisions (Aneesh, 2026-08-26)

1. **Convex is deleted entirely.** Not flagged off, not left dormant.
2. **Clerk is deleted.** No sign in, no account, no `publicMetadata` plan.
3. **Tiers are removed.** Notes, Analytics and all 20 themes unlock for everyone.
4. **Shell is Tauri v2.** Rejected Electron on installer size and the
   lightweight local-app positioning.
5. **One repo, two pipelines.** `frontend/` becomes the app with `src-tauri/`,
   `lander/` stays. Separate GitHub Actions workflows with separate triggers.
   Rejected a fresh repo: it costs 20k lines of history, CI and the Vitest suite.
6. **There IS real data to rescue.** Corrected 2026-08-26; the original answer
   described the dev deployment. Production is `dapper-mouse-450` serving
   `app.voidsteps.com`, holding 3,628 steps, 37 notes, 30 paths, 8 notebooks
   and 5 routines. See "Data migration" below.
7. **Network access is update checks only.** Sentry is removed. In-app feedback
   stops posting to a backend.
8. **Desktop replaces web.** `vite-plugin-pwa` is deleted and the browser build
   stops being a product surface. This knowingly departs from the 2026-08-18
   "web today, native later, every client free" line: one client to test, one
   storage story, no service worker cache bugs.
9. **Feedback becomes a mailto** opened in the system browser, prefilled from
   `feedback-diagnostics.ts`. `convex/feedback.ts` dies.
10. **Sync is removed outright, not preserved.** Whatever sync returns later
   will not be shaped like the current Convex queue, so keeping scaffolding for
   it is speculative dead code. No no-op stubs, no orphaned tables, no unread
   flags.

### Honest note on cost

Convex is almost certainly on the free tier at current usage, so this saves
little money today. The real wins are no server to run, no account to create,
and a clean privacy story. Positioning should say that, not "we cut our bill".

## Removal footprint

This is the bulk of the work and it is wider than the file list suggests,
because sync metadata is threaded through the read path rather than confined to
the sync layer. Measured on `staging` at `42ed16f`:

| Thing | Sites | Becomes |
|---|---|---|
| `_deleted` | 79 | Hard delete. Every `.filter(x => !x._deleted)` predicate goes away. |
| `syncQueue` / `syncMeta` | 97 | Gone. Dexie version 10 drops both stores. |
| `_localOnly` | 48 | Gone. Every row is local now, so the flag says nothing. |
| `enqueue()` calls | 48 in `local-mutations.ts` | Removed at the call site, not stubbed. |

Five separate enqueue helpers exist and all die: `local-mutations.ts`,
`routine-spawner.ts`, `seed-demo.ts`, `starter-pack.ts`, `backup-engine.ts`.

**Soft delete to hard delete is a real behaviour change, and it is safe here.**
There is no trash, no undo and no restore-deleted anywhere in `src/`; both
delete confirmations already say the action cannot be undone. Two things to
verify while doing it rather than assume:

- Day Log's `(deleted)` marker in `DayLogView.tsx` derives from a missing step,
  not from `_deleted` on the time entry. Hard deletes should keep it working and
  probably improve it, but confirm against `timesheet-utils.ts`.
- `userSettings` is read through `.filter(s => !s._deleted).first()` in three
  places. With one local user and no tombstones this collapses to a plain
  `.first()`, but check nothing depends on multiple settings rows existing.

**`updatedAt` and the string `_id` stay.** Those are product data (activity
ordering, primary keys), not sync metadata. Only the sync-specific flags go.

## Data migration

**IndexedDB is origin-scoped.** `https://app.voidsteps.com` in a Firefox-based
browser and a Tauri shell (`tauri://localhost`) are different origins, different
engines and different storage backends, so installing the dmg gives an empty
app. Data has to be carried across deliberately.

**Source of truth is the Convex prod export, not the browser.** Prod is a strict
superset: 3,628 steps against the browser's 3,436, 30 paths against 19. Neither
side has `timeEntries` or `activityEvents`, because timesheets never reached
production, so there is no timesheet history to preserve.

Snapshot taken 2026-08-26 to `.migration/convex-prod-export.zip` (389K,
gitignored, never committed). Layout is one `<table>/documents.jsonl` per table.
`pathways` (legacy, 4 rows) and `syncIdempotency` (583 rows) are not imported.

**Hard constraint: do not tear down either Convex deployment until the importer
has run successfully.** `staging` still carries `frontend/convex/`, so the whole
migration stays reversible until then.

## Phases

### P0. Strip the server and the sync layer

Delete: `frontend/convex/` (see rescue list), `src/lib/convex-client.ts`,
`convex-hooks.ts`, `sync-engine.ts`, `initial-sync.ts`, `backup-engine.ts`,
`sync-enabled.ts`, `sync-queue-actions.ts`, `use-plan.ts`, `sentry.ts`,
`src/pages/Login.tsx`, `src/pages/Admin.tsx`, `src/components/FeatureGate.tsx`,
`src/components/FailedSyncReviewDialog.tsx`, `src/hooks/useFailedSyncItems.ts`.

**Rescue before deleting `convex/`:**

- `convex/lib/recurrence.ts` moves into `src/lib/`. It is the shifted-UTC day
  boundary engine re-exported by `src/lib/calculate-next-occurrence.ts` and is
  core product logic, not server code.
- `ACTIVITY_RETENTION_DAYS_PRO` from `convex/lib/entitlements.ts` becomes a
  plain constant. The `_FREE` variant and the whole `can`/`planOf` API die.

Rewire: `src/main.tsx` drops `ClerkProvider` and `ConvexProviderWithClerk`.
`src/contexts/OfflineContext.tsx` loses auth, plan, sync engine and pending
counts, keeping only the routine spawner and online status, and should be
renamed to match. `Sidebar.tsx` and `Settings.tsx` lose account UI, plan badge
and sign out. `DataSettings.tsx` copy currently promises deletes "sync to the
server and apply to every device" and must be rewritten.

Then work the removal footprint table above, and bump Dexie to version 10
dropping `syncQueue` and `syncMeta`.

Drop deps: `@clerk/clerk-react`, `convex`, `@sentry/react`, `convex-test`,
`vite-plugin-pwa` (decision 8: the desktop shell replaces the browser build, so
the service worker and its `Admin-*.js` precache exclusions both die).

**Exit check:** app builds, `pnpm test` green, `tsc --noEmit` clean, zero
matches for `convex`, `clerk`, `sentry`, `enqueue` and `isSyncEnabled` across
`src/`, and the full flow works with no network.

`_deleted`, `_localOnly`, `syncQueue` and `syncMeta` are the exception: Dexie
version blocks 1 through 9 are a migration history and must keep naming the
tables they created, or the upgrade path breaks for any database that already
exists. Only v10 onward is clean.

**P0 landed 2026-08-26.** Typecheck clean, 76 tests green, production build
green, dev server serves. Also removed on the way, beyond the original list:
`online-status.ts`, `pwa-install.ts`, `admin-access.ts`, the `Layout` sync
indicator, the `userSettings.userId` column (one local user now), and the
`.env` Convex plus Sentry keys. `OfflineContext` became `AppLifecycleContext`,
which holds no state at all: it just runs the routine spawner, the activity
prune and the UTC offset refresh.

**Known gap opened by P0:** deleting `convex/` took seven test files with it
(`routines`, `steps`, `paths`, `batch`, `routineSpawner`, `timesheets`,
`entitlements`). Most tested server code that no longer exists, but routine
spawning now runs only on the client and `src/lib/routine-spawner.ts` has no
tests at all. Worth covering in P3 alongside the resume audit.

### P1. Local durability

Cloud backup was the safety net and it is going away, so this lands before the
shell, not after.

- Rewrite `backup-engine.ts` against the Tauri filesystem: automatic rotating
  JSON snapshots into the app data dir on a schedule, keeping the last N.
- Manual export and import to a user-chosen file, wired into Settings.
- Restore flow, including "restore from snapshot" after a bad wipe.
- **One-time Convex import** reading the export zip above into Dexie. Throwaway
  after a single successful run, and that is accepted rather than designed
  around.

### P2. Tauri shell

- Scaffold `src-tauri/` around the existing Vite build.
- Window state persistence, sane minimum size, native menu.
- **Highest risk item: IndexedDB durability.** Dexie is now the only copy of
  the data. Verify explicitly that WKWebView and WebView2 storage survives app
  updates and is not subject to eviction, and confirm where on disk it lives on
  both platforms. P1 snapshots are the mitigation if it is not guaranteed.
- Smoke test the heavy render deps under WKWebView rather than Chromium:
  `cytoscape`, `react-force-graph-2d`, and the ~1.4MB BlockNote editor.

### P3. Native affordances

- OS notifications for reminders and routine spawns. This is **new work**, not a
  port: reminders today are an in-app banner only (`TodayRemindersBanner.tsx`),
  there is no `Notification` usage anywhere in `src/`.
- Launch at login plus run in background or tray, otherwise reminders only fire
  while the window happens to be open.
- `startRoutineSpawner` already runs locally on an interval and on visibility
  change, so it needs a resume audit rather than a rewrite. Confirm it handles
  "app was closed for five days" and does not spawn duplicates.

### P4. Distribution

- GitHub Actions matrix on version tags: `macos-latest` builds a universal
  `.dmg`, `windows-latest` builds an NSIS `.exe`.
- Tauri updater pointing at a static JSON asset on GitHub Releases. This is the
  only network call the app makes.
- macOS needs an Apple Developer ID plus notarization or the dmg is
  quarantine-blocked. Check the enrollment already in flight for Plexa.
- Windows without a code signing certificate means every user sees a SmartScreen
  warning. Ship unsigned first, buy a cert if download drop-off justifies it.
- Split the lander deploy into its own workflow so it stops riding app tags.

### P5. Lander and docs

- Pricing section replaced with per-OS download buttons and a "free, local,
  no account" line.
- `PRICING_STRATEGY.md` archived with a header noting sync-based pricing returns
  with the sync feature.
- README rewritten (it currently describes an Express API at `localhost:5000`
  that has not existed for a long time). CHANGELOG entry.

## Out of scope

Sync, accounts, payments, mobile, Linux builds, AI or MCP features.

## Open questions

- Apple Developer account status and who owns it.
- Windows code signing certificate budget.
