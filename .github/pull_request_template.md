<!-- Keep this short. The diff says what changed; this says why. -->

**What and why**

<!-- What this changes, and the reasoning that is not obvious from the code:
     what you considered and rejected, what constraint forced the shape. -->

**How you verified it**

<!-- There is no component or end-to-end test layer, so UI changes are only as
     verified as you say they are. Say what you actually clicked. -->

- [ ] `pnpm build` green (runs `tsc` too, which is stricter than the tests)
- [ ] `pnpm test` green
- [ ] Checked in the desktop shell (`pnpm desktop:dev`), not only the browser

**If it applies**

- [ ] New Dexie migration adds a **new** version block; no old block was edited
- [ ] Writes go through `lib/local-mutations.ts`, not straight to Dexie
- [ ] No new network request of any kind
- [ ] No hardcoded colours; composed from the theme variables
- [ ] Any new bundled asset is in `CREDITS.md` with its source and licence
