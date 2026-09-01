# Contributing

Thanks for looking. VoidSteps is a local-only desktop task tracker: no accounts,
no server, no network calls. That constraint decides most of what follows.

## Running it

```bash
cd frontend
pnpm install
pnpm desktop:dev     # Tauri window, hot reloads the UI
pnpm test            # logic tests
```

You need Node, pnpm and a Rust toolchain (the desktop shell is Tauri).

`pnpm dev` runs the UI alone in a browser. It is faster for pure UI work but does
not exercise the desktop shell, so anything touching the shell must be checked
with `desktop:dev`.

`pnpm build` runs `tsc && vite build`. **Tests passing is not enough**, because
vitest is more forgiving than `tsc`. Run the build before opening a PR.

## Where code goes

- **`src/lib/`** is pure logic, and it is the only layer with tests. Date maths,
  recurrence, snapshot validation, quick-capture parsing. If a behaviour can be
  expressed without a component, put it here and test it.
- **`src/components/`, `src/pages/`** are UI. There is no component or
  end-to-end test layer yet, so this code is verified by hand. Keep logic out of
  it so it can be tested.
- **`src/lib/local-mutations.ts`** is the only write path. Never write to Dexie
  directly from a component: the activity log hangs off these mutations, so
  bypassing them silently loses history.
- **`src-tauri/`** is the desktop shell. App code must not import Node builtins;
  it runs in a webview.

## Rules that will bite you

**Dexie version blocks are a migration history.** Add a new `this.version(n)`
block, never edit an old one. Someone's installed app replays them in order, so
changing an old block corrupts their data. Old blocks may still name tables that
no longer exist; that is deliberate, leave them.

**Bundled assets need a licence entry before they are committed.** Anything under
`frontend/public/` that was not created for this project goes in
[CREDITS.md](CREDITS.md) with its source URL and licence. A test enforces this
for audio, and it fails the suite rather than shipping something uncredited. If
you have not verified an asset's licence, it does not go in.

**Nothing may make a network request.** The privacy claim is the product. No
analytics, no telemetry, no crash reporting, no remote fonts, no CDN. Errors are stored
locally in `lib/error-store.ts` and never leave the machine.

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

## Licence

Code contributions are under [GPL-3.0-or-later](LICENSE). By contributing you
agree your work ships under that licence.
