# VoidSteps

A local-only desktop task tracker. Paths, steps, routines and reminders, with a
focus timer, notes, analytics and a graph view.

Everything lives on your machine. There is no account and no server. The app
makes exactly one kind of network request, a version check against its own
GitHub releases, which you can switch off in Settings. Nothing about you or your
data is ever sent. A backup file is the only way your data leaves the device,
and you make it yourself.

Free, and complete. Nothing is gated, greyed out, or waiting behind an upgrade
prompt.

## Install

macOS `.dmg`, signed and notarized. Builds are not public yet.

Windows is not built yet. The app has no platform-specific code, so it is a
packaging and testing gap rather than a porting one, but an untested installer
is not worth shipping. Build it yourself with `pnpm desktop:build` in the
meantime.

## Repository layout

```
app/               the UI: React 19 + Vite + Tailwind
  lib/db.ts            Dexie schema; version blocks are a migration
                       history, add a new one, never edit an old one
  lib/mutations/      domain writes, transactions and activity history
  lib/local-mutations.ts   stable React adapters for those services
  lib/snapshot.ts      the one backup and restore format
  lib/recurrence.ts    routine scheduling, in a shifted-UTC frame
desktop/           the Tauri shell (Rust)
public/            static assets, all credited in CREDITS.md
```

Build and tool configuration lives at the repository root, so `pnpm` commands
run from anywhere in the tree without changing directory first.

## Development

You need Node 22 (see `.nvmrc`), pnpm 11, and a Rust toolchain for the desktop
shell.

```bash
pnpm install
pnpm desktop:dev     # Tauri window, hot reloads the UI
pnpm test            # logic, storage and component tests
pnpm lint            # eslint
pnpm format          # prettier
```

`pnpm dev` runs the UI alone in a browser, which is faster for pure UI work but
does not exercise the desktop shell.

## Building a release

```bash
pnpm desktop:build
```

Output lands in `desktop/target/release/bundle/`. macOS builds are unsigned
unless the Apple Developer ID variables are set, and an unsigned build is
quarantined on any machine that did not compile it. To test one locally:

```bash
xattr -dr com.apple.quarantine <path to .app>
```

Every merge to `main` that carries a `feat` or `fix` commit releases itself:
`feat` bumps the minor version, `fix` and `perf` the patch, and anything else
ships nothing. CI then builds, signs and notarizes macOS and publishes the
release, see `.github/workflows/auto-release.yml` and `release.yml`.

## Storage and privacy

Data sits in IndexedDB via Dexie, inside the desktop app's own storage. It is
never uploaded, because there is nowhere to upload it to.

Two consequences worth knowing:

- **Storage is origin-scoped.** The old browser build and the desktop app are
  different origins with different storage backends, so nothing transfers
  between them by itself. Move data with a backup file.
- **A backup file is your only recovery path.** Settings has backup and restore,
  and both use the same format described in `app/lib/snapshot.ts`.

## History

VoidSteps was a web app with accounts and server sync until August 2026, when it
became a local-only desktop app. Accounts, the server and the sync engine were
removed rather than disabled. Multi-device sync is expected to return later as a
separate, paid feature, rebuilt rather than resumed; the app itself stays free.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) covers running it, where code goes, and the
rules that will bite you (Dexie migrations, the no-network constraint, the asset
licence rule). Also: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and, for anything
security-shaped, [SECURITY.md](SECURITY.md) rather than a public issue.

First-time contributors agree to the [CLA](CLA.md) in their pull request. You keep
your copyright; it is a licence grant, not an assignment.

## Licence

Copyright (C) 2026 Aneesh Bhat

**Code is licensed under GPL-3.0-or-later.** See [LICENSE](LICENSE). You may use,
modify and redistribute it, including commercially. If you distribute a modified
build, you must ship its source under the same licence.

**Bundled assets are not GPL.** The five focus-mode tracks are CC0 1.0 Universal by
[HoliznaCC0](https://freemusicarchive.org/music/holiznacc0/public-domain-lofi). They
carry their own terms and are not covered by the code licence. Every bundled asset,
its source and its licence are listed in [CREDITS.md](CREDITS.md).

**VoidSteps and the Void mark are trademarks**, and the licence does not grant
rights to them. A fork is welcome; a fork trading under this name is not.
