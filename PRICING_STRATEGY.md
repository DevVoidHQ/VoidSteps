# VoidSteps — Pricing & Go-to-Market Strategy

_Draft v1 · 2026-05-31 · status: for review_

---

## 1. Product recap (positioning)

VoidSteps is an **offline-first personal goal tracker**. The model is:

> **Paths** (your goals) → nested **Steps** (actionable items, priorities, due dates, drag & drop) → **Routines** (recurring habits) + **Focus Timer** + **Notebooks/Notes** (rich BlockNote editor) + **Analytics** + **Graph Visualization** (ReactFlow) + **21 themes**.

Single user. No social, no feeds, no notifications-from-others. Data lives on the device first (IndexedDB / Dexie), syncs to the cloud (Convex) when online. Auth via Clerk. App lives at `app.voidsteps.com`.

**Core promise:** _Structure your goals. Own your focus. Own your data._

The current landing page communicates the vibe well (offline, anti-distraction, focus) but says nothing about plans, price, or **why sync matters**. "Free during beta" is the only money signal — there is no path to revenue. This document fixes that.

---

## 2. Unit economics

The stack is **Convex + Clerk + a static Astro lander**. Because the app is offline-first, the server is barely touched — local IndexedDB does the real work; the server only sees sync traffic.

### Fixed cost floor — roughly $25–50/mo

| Item | Cost |
|---|---|
| Convex Pro | $25/mo (incl. 25M function calls, 50GB storage) |
| Clerk | $0 until 10,000 MAU |
| Lander hosting | $0 (static; Cloudflare/Vercel free tier) |
| Domain | ~$1/mo |

### Marginal cost per user — roughly $0.02–0.05/mo

- **Compute (sync):** an engaged daily user runs ~8,000 Convex function calls/mo (pull every 60s while open + batched push every 5s when there are queued changes). The 25M included quota covers ~3,000 heavy daily users _for free_. Overage is ~$2/M calls → 8k calls ≈ **$0.016/user/mo**.
- **Storage:** task data is tiny text; even a power user with notes is ~2MB → ~500 users/GB. DB storage ~$0.20/GB-mo → **$0.0004/user/mo**. Negligible.

### Verdict

Classic **~98% gross-margin SaaS**. Cost is _not_ the constraint — willingness-to-pay and activation are. Critically: **free users cost ≈ $0 to serve**, so the free tier can be generous without risk.

---

## 3. Strategic insight: sync is the natural paywall

Offline-first, single-device usage costs us nothing — the data is local. **Cross-device sync + cloud backup is literally the only place our server cost lives.** So we price exactly that. Cost aligns with value perfectly:

- **Free** = offline, one device, local-first. ~$0 to serve. Generous → fills the funnel.
- **Paid** = sync + multi-device + cloud backup + power features. The thing that actually costs us money is the thing people pay for.

Our audience (anti-subscription, privacy-leaning, focus-seeking) also responds strongly to a **lifetime tier** — it fits the "own it forever, no cloud lock-in" ethos and generates launch cash up front.

### What's gated (decided)

Free includes **full usage of all core features** — paths, steps, routines, focus timer, all themes, graph visualization, drag & drop — with **no caps**, and it **does sync** (so data is backed up and reaches other devices) — but on a **daily** cadence. The paid difference is **speed and two feature modules**:

1. **Near-real-time sync** (Free = once/day; Pro/Lifetime = live ~every few seconds). This is the cost-aligned paywall — real-time sync is what actually costs us money.
2. **Notes & Notebooks** (BlockNote editor).
3. **Analytics**.

Why this is the right cut economically: **daily sync ≈ ~30 function calls/user/mo (≈ $0)**, while near-real-time ≈ ~8,000/mo. So Free stays nearly free to serve _and_ gets the peace-of-mind of backup, while the thing people pay for is still the thing that costs us. Clean upgrade story: _"go live, write notes, see your analytics."_

---

## 4. Plans (selected: Free + Pro + Lifetime)

Pricing is **region-based** (PPP / geo). India gets a localized price; rest of world (RoW) pays standard.

| | **Free (Solo)** | **Pro** | **Lifetime** |
|---|---|---|---|
| **Price — India** | $0 forever | **$5/mo** | **$100 one-time** |
| **Price — Rest of world** | $0 forever | **$10/mo** | **$200 one-time** |
| Offline-first | ✓ | ✓ | ✓ |
| Cloud **Sync** + multi-device + backup | ✓ (**daily**) | ✓ (**near-real-time**) | ✓ (**near-real-time**) |
| **Notes & Notebooks** | — | ✓ | ✓ |
| **Analytics** | — | ✓ | ✓ |
| Paths / steps / routines | full, uncapped | full | full |
| Focus timer | ✓ | ✓ | ✓ |
| All 21 themes | ✓ | ✓ | ✓ |
| Graph visualization | ✓ | ✓ | ✓ |
| Future paid features | — | included | included |

**Notes**
- **Free includes daily sync** — data is backed up and reaches other devices once a day; the paid upgrade is going **near-real-time** plus unlocking **Notes** and **Analytics**.
- **Lifetime = 20 months of Pro** ($5×10×2 India / $10×10×2 RoW). Caps customer spend, funds infra up front, and matches the anti-subscription ethos. Natural launch hero.
- Region detection: Dodo Payments resolves the buyer's country at checkout (see §6) — show the matching price, default to RoW when unknown.

### Breakeven

Fixed floor is ~$25–50/mo. At Pro pricing that's **~3–5 RoW Pro users** (or ~5–10 India) to cover everything; every customer beyond is ~pure margin. A couple of Lifetime sales wipe out months of fixed cost instantly.

---

## 5. Pricing rationale & risks

**Why regional ($5 India / $10 RoW):** VoidSteps is built by an India-based dev for a global audience. $5 is an impulse price in India; $10 is still impulse-tier in RoW for a tool you use daily, and our cost structure makes both highly profitable. Geo pricing maximizes conversion in price-sensitive markets without leaving RoW money on the table.

**Why Lifetime = 20× monthly ($100 / $200):** keeps the lifetime↔monthly math honest and rational — a buyer breaks even vs. subscription at ~20 months, so it's an easy "yes" for committed users while protecting recurring revenue from churning everyone to one-time.

**Risks / watch-items**
- _Lifetime liability:_ a lifetime user keeps costing ~$0.05/mo forever. Trivial at our margins unless someone becomes an extreme power user — acceptable.
- _Free too generous / not generous enough?_ Free is a complete tracker with daily sync; the upgrade is real-time sync + Notes + Analytics. Sharp, honest story. Watch conversion: if "daily sync is enough" dominates, lean on the **live multi-device** experience and **Notes** as hooks, surfaced contextually (e.g. when a user edits on a 2nd device and sees stale data, or taps Notes/Analytics). Make the daily-vs-live difference visible (e.g. "last synced 6h ago" nudge).
- _Geo-pricing arbitrage:_ VPN users could grab India pricing. Dodo resolves country by payment/billing data at checkout (harder to spoof than IP) — acceptable leakage; don't over-engineer.
- _Beta → paid transition:_ current beta users got everything free. Grandfather them into a perk (discounted Lifetime, or Pro free for X months) to avoid resentment.

---

## 6. Payments — Dodo Payments

Processor is **Dodo Payments** (Merchant of Record). Why it fits:
- **MoR** → Dodo handles global sales tax / VAT / GST remittance; solo dev doesn't register in every jurisdiction.
- **Strong India support + global cards/UPI** → matches the India/RoW split.
- **Country resolved at checkout** from billing data → drives which price (India vs RoW) to charge, harder to spoof than IP.

Integration shape (for the build task, not now):
- Products in Dodo: `pro-monthly-IN`, `pro-monthly-ROW`, `lifetime-IN`, `lifetime-ROW` (or one product with geo price variants if Dodo supports it).
- Checkout via Dodo hosted checkout or SDK from `app.voidsteps.com`.
- **Webhooks** → Convex HTTP action verifies the event and flips the user's entitlement (`plan: free | pro | lifetime`) in the `userSettings`/billing table. Gate **sync cadence** (daily vs near-real-time), **Notes**, and **Analytics** on that flag — for Free, throttle the sync engine's pull/push to once/day server-side.
- Keep entitlement server-authoritative (Convex), with a cached read client-side for UI gating.

## 7. Landing page changes (next step, separate task)

1. **Add a `PricingSection`** between `SocialProofSection` and `CTASection` — three cards (Free / Pro / Lifetime) with a **region toggle or auto-detected India/RoW price**. Lead the paid tiers with the **real-time sync + Notes + Analytics** bundle (Free shows "daily sync"). Match existing framer-motion + brand styling (#083291 / #c26579, Satoshi).
2. **Reframe hero badge + CTA** from "Free during beta" → launch messaging that headlines **Lifetime** and the forever-free offline tier.
3. **Add a "Pricing" nav/anchor.**
4. **Strengthen the "own your data / no subscription trap"** copy thread for the Lifetime + offline-first story.

---

## 8. Open decisions for the user

- [ ] Beta-user grandfather perk (discounted Lifetime? Pro free for N months?).
- [ ] Region detection on the lander: auto-detect IP for display + let Dodo confirm at checkout, or simple manual India/RoW toggle.
- [ ] Annual Pro option, or monthly + lifetime only? (Currently monthly + lifetime.)
- [ ] Launch timing for flipping "beta free" → paid plans.
