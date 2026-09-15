# Contributing

Thanks for looking. VoidSteps is a local-only desktop task tracker: no accounts,
no server and no data uploads. The optional GitHub release updater is the only
network exception. That constraint decides most of what follows.

## Running it

```bash
pnpm install
pnpm desktop:dev     # Tauri window, hot reloads the UI
pnpm test            # logic, storage and component tests
pnpm lint            # eslint
pnpm format          # prettier
```

Everything runs from the repository root. You need Node 22 (see `.nvmrc`),
pnpm 11 and a Rust toolchain (the desktop shell is Tauri).

`pnpm dev` runs the UI alone in a browser. It is faster for pure UI work but does
not exercise the desktop shell, so anything touching the shell must be checked
with `desktop:dev`.

`pnpm build` runs `tsc && vite build`. **Tests passing is not enough**, because
vitest is more forgiving than `tsc`. Run the build before opening a PR.

## Where code goes

- **`app/lib/`** holds domain logic and storage services. Date maths, recurrence,
  snapshot validation and quick-capture parsing have unit tests; mutations and
  migrations have integration tests using in-memory IndexedDB.
- **`app/components/`, `app/pages/`** are UI. Shared keyboard controls and note
  persistence have component tests. Browser smoke tests live in `e2e/`.
- **`app/lib/mutations/`** contains domain mutation services. The stable hook
  adapters in `app/lib/local-mutations.ts` expose them to React. Components must
  use these services rather than writing domain entities directly to Dexie,
  because mutations also maintain activity history and timer totals.
- Snapshot restore, data wipe, routine spawning, lifecycle maintenance and
  media/settings helpers own their dedicated storage operations. Multi-table
  changes must be transactional, including the snapshot export read.
- **`desktop/`** is the desktop shell. App code must not import Node builtins;
  it runs in a webview.

## Rules that will bite you

**Dexie version blocks are a migration history.** Add a new `this.version(n)`
block, never edit an old one. Someone's installed app replays them in order, so
changing an old block corrupts their data. Old blocks may still name tables that
no longer exist; that is deliberate, leave them.

**Bundled assets need a licence entry before they are committed.** Anything under
`public/` that was not created for this project goes in
[CREDITS.md](CREDITS.md) with its source URL and licence. A test enforces this
for audio, and it fails the suite rather than shipping something uncredited. If
you have not verified an asset's licence, it does not go in.

**The webview must not make a network request.** The privacy claim is the product. No
analytics, no telemetry, no crash reporting, no remote fonts, no CDN. Errors are stored
locally in `app/lib/error-store.ts` and never leave the machine. The Rust updater
may check and download this app's GitHub releases when enabled or requested.

**Never hardcode a colour.** Theming is six HSL variables with contrast-derived
foregrounds. Compose from `var(--background)`, `var(--primary)` and friends so
components follow whichever theme preset is active. A grey or a hex in a
component is a bug, not a shortcut.

## Commits and branches

Conventional prefixes, lowercase, imperative: `feat:`, `fix:`, `chore:`,
`refactor:`, `style:`, `test:`.

Explain **why**, not what. The diff already says what changed. The commit body is
where the reasoning that is not obvious from the code belongs: what you
considered and rejected, what constraint forced the shape, what will bite the
next person.

No em dashes or en dashes anywhere: prose, code, comments or commit messages.

## Pull requests

- One change per PR. A PR that fixes a bug and refactors is two PRs.
- Say what you verified by hand, especially for UI, since nothing else will.
- `pnpm build` and `pnpm test` both green. CI runs `tsc --noEmit` and `pnpm test`,
  so a type error fails the build even when every test passes.

## Reporting things

Bugs and features go in [issues](../../issues). Security reports do not: see
[SECURITY.md](SECURITY.md).

## Licence and the CLA

Code contributions are under [GPL-3.0-or-later](LICENSE).

**First-time contributors: paste this as a comment on your pull request.**

> I have read the CLA document and I hereby sign the CLA.

That is the whole process, once per person, covering everything you contribute
from then on.

A maintainer records it in [.cla-signatures.md](.cla-signatures.md) and commits
that before merging, so the record lives in the repository rather than in a
comment its author can edit or delete.

[CLA.md](CLA.md) is the agreement and explains why it exists. The short version:
**you keep your copyright.** It is a licence grant, not an assignment, and the
part that matters is permission to relicense the project later. Without it, one
merged contribution makes the licence permanent, and this project has already
changed licence once.

### No per-file licence headers

This is a deliberate decision, not an oversight: source files do not carry SPDX
or copyright headers. The repository-level [LICENSE](LICENSE) plus the
copyright line in the README's Licence section already cover every file, and in
a single-owner codebase per-file headers are noise. Do not add them.

## Browser checks

Install the browser once with `pnpm exec playwright install chromium`.
Start the production preview with `pnpm build` then `pnpm preview --port 4173`,
and run `pnpm test:e2e`. In Void, run the preview and test process using `void run`.
Browser contexts are isolated and never access the installed desktop database.
The suite checks note persistence, backup/restore, deletion and route rendering.
Native signed installation and update delivery still require a release-environment
check; a browser test cannot validate those platform services.
