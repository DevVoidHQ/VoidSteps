# VoidSteps - Pricing Strategy

_Finalized 2026-06-06. India-first launch. Supersedes all earlier pricing notes._

## TL;DR

Offline-first means server cost lives almost entirely in **sync cadence**, so that
is the paywall. Free is a genuinely complete tracker with **daily** sync; Pro adds
**real-time** sync + Notes + Analytics. Launch is **India-first**, led by a
**capped lifetime offer (1,000 slots, then retired forever)**.

## Tiers

| Tier | India | RoW | What you get |
|---|---|---|---|
| **Free** | ₹0 | $0 | All core: unlimited paths/steps/routines, **reminders**, focus timer, graph viz, **2 starter themes** (devvoid + dark), **daily cloud sync** (backup peace-of-mind). No Notes, no Analytics, no real-time sync, no custom/extra themes. |
| **Pro - Monthly** | **₹249/mo** | **$7/mo** | Everything: **real-time sync** across devices, **Notes & notebooks**, **Analytics & history**, **all 20 themes + custom/AI theme editor**, all future Pro features. |
| **Pro - Lifetime** | **₹4,999** | **$149** | All current + future **Pro-tier** features, one payment, forever. **HERO SKU. Hard cap: 1,000 buyers globally (shared pool), then retired permanently.** Excludes the future Pro Plus tier (see below). |

- **Annual** Pro (~₹1,999/yr ≈ 33% off; RoW ~$70/yr) is **NOT offered at launch**.
  It is introduced in **Phase 2**, after the 1,000 lifetime slots sell out.
- **Region** is resolved at checkout (India vs Rest-of-World). Lander auto-detects
  IST via timezone for display.

### Naming is deliberate: "Pro Lifetime", not "Lifetime"

Lifetime covers the **Pro tier** forever - not literally every feature VoidSteps
will ever ship. This leaves room for a future **Pro Plus** tier without breaking
the lifetime promise or the marketing.

### Future tier - Pro Plus (AI / MCP / integrations)

A planned higher tier housing **AI features, MCP, and third-party integrations**.

- **Subscription-only. Never bundled into Lifetime.** Even Pro Lifetime holders pay
  separately for Pro Plus.
- **Why it cannot be lifetime:** these features carry **real per-use marginal cost**
  (LLM tokens, integration/API calls). Bundling metered-cost features into a
  one-time payment is an unbounded loss per user. Ring-fencing them is precisely
  what keeps the "Pro Lifetime, forever" promise economically safe.
- **Marketing guardrail:** lifetime copy must say "all future **Pro** features",
  **never** "all future updates/features forever". (Current lander lifetime line
  "All future updates included" is wrong - must be fixed.)
- Pricing/launch TBD; introduced after Phase 1/2.

## Rollout phases

1. **Phase 1 - Launch (now):** Free + Pro Monthly + **Pro Lifetime (capped 1,000)**.
   Sell globally from day one; India is the primary audience and fills the pool
   first, RoW buys from the same 1,000.
2. **Phase 2 - After lifetime sells out:** add **Annual**. Lifetime stays closed
   forever. Steady state = Free + Monthly + Annual.
3. **Phase 3 - International push:** broaden RoW marketing; revisit RoW price
   points with real conversion data. **Pro Plus** (AI/MCP/integrations,
   subscription-only) layers on top whenever it's ready.

## Why this shape

- **Paywall is feature-differentiated, anchored on a cost-aligned core.** Sync
  cadence stays the cost-real wall (below), but real-time-sync *alone* is too
  abstract to convert a ₹4,999 lifetime - single-device users feel nothing.
  So Pro also bundles tangible, wantable, **zero-marginal-cost** features
  (Notes, Analytics, full theming). Gating zero-cost features is pure margin and
  carries no Lifetime liability. **Reminders and unlimited steps stay Free** - they're core/expected, and gating them reads as nickel-and-diming.
- **Sync is the cost-aligned paywall.** Daily sync ≈ 30 Convex calls/user/mo (~₹0
  to serve); real-time ≈ 8k calls/user/mo. Charging for real-time aligns price
  with the only cost that scales per active user. Free stays ~free to serve.
- **India-first → lead with lifetime, not monthly.** Indian buyers prefer one-time
  payment (subscription fatigue), and the **flat ₹33 (~40¢) Dodo fee per
  transaction** makes low-price monthly inefficient (13% of ₹249) while it's
  negligible on a ₹4,999 one-time charge. Lifetime wins on both preference and margin.
- **The 1,000 cap is a liability bound, not just scarcity.** Lifetime users cost
  ~₹0/mo to serve today but carry perpetual support + dev obligation. Capping at
  1,000 fixes that obligation at a known, manageable size while creating a real
  launch urgency event. After the cap, the business is recurring (monthly/annual).
- **UPI Autopay removes the recurring-friction objection.** Dodo supports
  RBI-compliant UPI/RuPay subscription mandates, so monthly is viable in India.

## Unit economics

**Payment processor: Dodo Payments** (Merchant of Record - handles global tax/VAT/
GST + India UPI/RuPay/NetBanking, INR settlement, chargebacks). Fee: **4% + ₹33/40¢
base**, **+1.5% international**, **+0.5% subscription**. India INR sales are
domestic for Dodo (no international surcharge).

| SKU | Price | Dodo fee | Net | Margin |
|---|---|---|---|---|
| Lifetime (India) | ₹4,999 | ~₹233 (4% + ₹33) | **₹4,766** | **95%** |
| Lifetime (RoW) | $149 | ~$8.40 (5.5% + 40¢) | **$140.60** | **94%** |
| Monthly (India) | ₹249/mo | ~₹44 (4.5% + ₹33) | **₹205** | **82%** |
| Monthly (RoW) | $7/mo | ~$0.79 (5.5% + 40¢) | **$6.21** | **89%** |

- A lifetime sale ≈ **24 months** of a monthly sub's net, paid upfront. In
  high-churn India, upfront wins.
- **Lifetime launch ceiling (1,000 slots):** all-India ≈ **₹50L gross / ₹47.7L net
  (~$56.7k)**; all-RoW ≈ **$149k**; realistic 800-India/200-RoW mix ≈ **₹65L net
  (~$77k)**. One-time runway.

## Cost floor & scaling

- **Convex Pro $25/mo** base covers ~25M function calls = **~3,100 real-time Pro
  users** or **~830k daily-sync free users**. Never the bottleneck at indie scale.
- **Clerk** free to **10k MAU** (counts free users too); past that ~$0.02/MAU.
  **This - not sync - is the real cost line that grows**, driven mostly by free
  users. Watch it as total signups approach 10k.
- **Lander** (Astro static) ~₹0. Domain trivial.
- **Floor ≈ ₹2,500/mo (~$30).** Breakeven ≈ **6 lifetime sales** or **~12 India
  monthly subs** covers a full year.

## Entitlement (server-authoritative)

- Plan stored in Clerk `publicMetadata.plan` = `free | pro | lifetime`. Single
  source of truth for gating is the capability matrix in
  `frontend/convex/lib/entitlements.ts` - imported by BOTH Convex (server
  enforcement) and the React client (UX gates). Flip parity by editing that one
  file. Client hooks: `usePlan` / `useCan` (`frontend/src/lib/use-plan.ts`).
- **Server enforcement is flag-gated.** `requireFeature` / batch gating only
  enforce when Convex env `ENTITLEMENTS_ENFORCED=true`, AND it needs the Clerk
  "convex" JWT template to expose the plan claim:
  `{ "plan": "{{user.public_metadata.plan}}" }`. Until both are set, the server
  reads everyone as `free`, so enforcement stays OFF (client gates still apply).
  Rollout: add JWT claim → `npx convex env set ENTITLEMENTS_ENFORCED true`.
- Dodo webhook → Convex HTTP action sets the plan on successful payment.
- Gated features: **sync cadence** (daily vs real-time, client cadence lever),
  **Notes** (server-enforced via `batch.pushBatch` + per-entity create AND update
  mutations), **Analytics** (client route gate), **themes** (2 free presets; all 20
  + custom/AI = Pro, cosmetic client gate).
- **Access requires an active entitlement - hard wall.** Notes and Analytics are
  Pro/Lifetime-only to *access*, not just to create. On downgrade the `/notes` and
  `/analytics` routes show an upgrade wall (no read access). This is deliberate:
  the subscription is the product, so access ends when payment ends.
- **Downgrade locks data, never destroys it.** A downgraded user's notebooks/notes
  remain on the server (and in their local store) untouched - just inaccessible
  until they re-subscribe, at which point everything is back. The sync layer must
  therefore **not delete** local note rows it can't push under Free; it stops
  retrying but preserves the data for a future re-upgrade.
- **Lifetime cap enforcement:** server-side counter; checkout for lifetime must
  reject once 1,000 confirmed sales exist (atomic check to avoid overselling).

## Beta / launch perks

- **Beta users: free Pro for 1 year** (time-boxed grandfather; converts to paid
  after). Rewards early users without permanent liability.

## Open / not yet built (implementation backlog)

- [ ] **Lander prices are STALE** - currently ₹499/$10 Pro, ₹9,980/$200 lifetime.
      Update to ₹249/$7 + ₹4,999/$149. Remove annual. Add **lifetime cap counter
      / "only 1,000 ever" messaging**. **Fix lifetime line "All future updates
      included" → "All future Pro features"** (Pro Plus is excluded).
      **Also: themes move to the Pro column ("2 free, all 20 + custom on Pro");
      reminders stays Free; drop "all 21 themes" from Free copy.**
- [ ] **Dodo checkout not wired** - CTAs still point to `app.voidsteps.com/login`.
- [x] **Entitlement gating built (client + flag-gated server)** - capability
      matrix (`entitlements.ts`), `usePlan`/`useCan`, sync-cadence lever, Notes
      server gate (batch + per-entity), Analytics view gate, theme picker gate,
      `FeatureGate` upgrade walls. Remaining: set Clerk JWT `plan` claim, flip
      `ENTITLEMENTS_ENFORCED`, wire Dodo webhook → HTTP action, lifetime cap counter.
- [ ] Annual SKU (Phase 2).
