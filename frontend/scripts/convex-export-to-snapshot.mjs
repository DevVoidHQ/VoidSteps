#!/usr/bin/env node
/**
 * One-time migration off the old hosted VoidSteps.
 *
 * Converts a `convex export` zip into the ordinary snapshot file the app
 * already imports, so nothing about this migration has to live in the app
 * itself. Run it once, import the result through Settings > Data > Backup,
 * then this script and the Convex deployments can both go away.
 *
 *   node scripts/convex-export-to-snapshot.mjs <export.zip> [--user <id>] [--out <file>]
 *
 * With no --user it lists the accounts in the export and stops. That is
 * deliberate: the hosted version was multi-tenant and the desktop app is not,
 * so importing without choosing an account would merge strangers' data into
 * yours.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const SNAPSHOT_FORMAT = 'voidsteps-snapshot';
const SNAPSHOT_VERSION = 1;

// Tables carried across. `pathways` was removed from the app years ago,
// `syncIdempotency` and `backups` were sync plumbing, `users` and `feedback`
// were server concerns. None of them have a home in a local-only app.
const TABLES = [
  'steps', 'paths', 'routines', 'reminders',
  'notebooks', 'notes', 'userSettings', 'timeEntries', 'activityEvents',
];

// Convex bookkeeping and fields the local schema dropped. `recurring` predates
// routines, `parentId` predates the removal of sub-steps in Dexie v6.
const DROP_FIELDS = new Set(['_creationTime', 'userId', 'recurring', 'parentId']);

function readTable(zip, table) {
  try {
    const raw = execFileSync('unzip', ['-p', zip, `${table}/documents.jsonl`], {
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return []; // table absent from this export
  }
}

/** Convex numbers arrive as floats; the local schema wants integer epochs. */
function clean(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (DROP_FIELDS.has(k)) continue;
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'number' && Number.isInteger(Math.round(v)) ? Math.round(v) : v;
  }
  return out;
}

const args = process.argv.slice(2);
const zip = args.find((a) => !a.startsWith('--'));
const userId = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'voidsteps-migration.json';

if (!zip) {
  console.error('usage: convex-export-to-snapshot.mjs <export.zip> [--user <id>] [--out <file>]');
  process.exit(1);
}

const tables = Object.fromEntries(TABLES.map((t) => [t, readTable(zip, t)]));

if (!userId) {
  const seen = new Map();
  for (const rows of Object.values(tables)) {
    for (const row of rows) {
      if (!row.userId) continue;
      seen.set(row.userId, (seen.get(row.userId) ?? 0) + 1);
    }
  }
  if (seen.size === 0) {
    console.error('No userId on any row. This export may already be single-user.');
    process.exit(1);
  }
  console.log(`Accounts in ${basename(zip)}:\n`);
  for (const [id, n] of [...seen].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)} rows   ${id}`);
  }
  console.log('\nRe-run with --user <id> to build a snapshot for one of them.');
  process.exit(0);
}

const data = {};
const counts = {};
for (const table of TABLES) {
  const rows = tables[table].filter((r) => r.userId === undefined || r.userId === userId);
  data[table] = rows.map(clean);
  counts[table] = rows.length;
}

// A step pointing at someone else's path, or at one deleted long ago, would
// render as unfiled. Blank the dangling reference instead so it lands in the
// inbox rather than looking like a path that failed to load.
const pathIds = new Set(data.paths.map((p) => p._id));
const notebookIds = new Set(data.notebooks.map((n) => n._id));
let orphanedSteps = 0;
let orphanedNotes = 0;
for (const step of data.steps) {
  if (step.pathId && !pathIds.has(step.pathId)) { delete step.pathId; orphanedSteps++; }
}
data.notes = data.notes.filter((n) => {
  const keep = !n.notebookId || notebookIds.has(n.notebookId);
  if (!keep) orphanedNotes++;
  return keep;
});

writeFileSync(out, JSON.stringify({
  format: SNAPSHOT_FORMAT,
  version: SNAPSHOT_VERSION,
  createdAt: Date.now(),
  source: `convex export, account ${userId}`,
  data,
}));

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`Wrote ${out}`);
for (const table of TABLES) {
  if (counts[table]) console.log(`  ${String(counts[table]).padStart(6)}  ${table}`);
}
console.log(`  ${String(total).padStart(6)}  total`);
if (orphanedSteps) console.log(`\n${orphanedSteps} steps pointed at a path outside this account; moved to unfiled.`);
if (orphanedNotes) console.log(`${orphanedNotes} notes had no notebook in this account; dropped.`);
