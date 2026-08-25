# VoidSteps

Local-first tracker for paths, steps, routines and reminders, with a focus
timer, notes, analytics and a graph view.

Everything lives on your machine. There is no account, no server and no
network call except the update check. A backup file is the only way data
leaves the device, and you make it yourself.

## Running it

```bash
pnpm install
pnpm desktop:dev     # Tauri window, hot reloads the UI
```

`pnpm dev` runs the UI alone in a browser, which is faster for pure UI work
but does not exercise the desktop shell.

## Building a release

```bash
pnpm desktop:build
```

Output lands in `src-tauri/target/release/bundle/`. macOS builds are
unsigned unless the Apple Developer ID variables are set, and an unsigned
build is quarantined on any machine that did not compile it. For local
testing: `xattr -dr com.apple.quarantine <path to .app>`.

CI builds both platforms on a `v*` tag (`.github/workflows/release.yml`).

## Layout

- `src/` React 19 + Vite + Tailwind
- `src/lib/db.ts` Dexie schema. Version blocks are a migration history:
  add a new one, never edit an old one.
- `src/lib/local-mutations.ts` every write goes through here
- `src/lib/snapshot.ts` the one backup/restore format
- `src/lib/recurrence.ts` routine scheduling in a shifted-UTC frame
- `src-tauri/` the desktop shell
- `scripts/` one-off tooling, not shipped

## Tests

```bash
pnpm test
```

Pure logic only: recurrence, dates, timesheets, activity log, snapshot
validation. There is no component or end-to-end layer yet.
