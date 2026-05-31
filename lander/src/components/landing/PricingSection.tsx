import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import Reveal from "./Reveal";
import { cn } from "@/lib/cn";

const APP_URL = "https://app.voidsteps.com/login";

type Region = "in" | "row";

const PRICES = {
  pro: { in: "₹499", row: "$10" },
  lifetime: { in: "₹9,980", row: "$200" },
} as const;

type Tier = {
  key: string;
  name: string;
  tagline: string;
  price: (r: Region) => string;
  period: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: { label: string; included: boolean }[];
};

const tiers: Tier[] = [
  {
    key: "free",
    name: "Free",
    tagline: "A complete tracker, forever.",
    price: () => "$0",
    period: "forever",
    cta: "Start free",
    href: APP_URL,
    features: [
      { label: "Unlimited paths, steps & routines", included: true },
      { label: "Focus timer & all 21 themes", included: true },
      { label: "Graph visualization", included: true },
      { label: "Cloud sync, once a day", included: true },
      { label: "Real-time sync across devices", included: false },
      { label: "Notes & notebooks", included: false },
      { label: "Analytics", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "Everything, in real time.",
    price: (r) => PRICES.pro[r],
    period: "/ month",
    cta: "Get Pro",
    href: APP_URL,
    featured: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Real-time sync across all devices", included: true },
      { label: "Notes & notebooks", included: true },
      { label: "Full analytics & history", included: true },
      { label: "Cloud backup", included: true },
      { label: "All future Pro features", included: true },
    ],
  },
  {
    key: "lifetime",
    name: "Lifetime",
    tagline: "Pay once. Keep it forever.",
    price: (r) => PRICES.lifetime[r],
    period: "one-time",
    cta: "Get Lifetime",
    href: APP_URL,
    features: [
      { label: "Everything in Pro", included: true },
      { label: "One payment, no subscription", included: true },
      { label: "All future updates included", included: true },
      { label: "Support an independent tool", included: true },
    ],
  },
];

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("row");

  // Calm auto-detect: default to India pricing for IST users. No network call.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") setRegion("in");
    } catch {
      /* keep default */
    }
  }, []);

  return (
    <section id="pricing" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary/60">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Start free. Upgrade when you're ready.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-foreground/55">
            The free plan is genuinely complete. Pro unlocks real-time sync,
            notes, and analytics.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:items-start">
          {tiers.map((tier, i) => (
            <Reveal
              key={tier.key}
              delay={i * 80}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border p-7",
                tier.featured
                  ? "border-primary/40 bg-background shadow-[0_24px_60px_-24px_rgba(8,50,145,0.35)] md:-mt-4 md:pb-9 md:pt-9"
                  : "border-foreground/10 bg-background"
              )}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold">{tier.name}</h3>
              <p className="mt-1 text-sm text-foreground/50">{tier.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price(region)}
                </span>
                <span className="text-sm text-foreground/45">{tier.period}</span>
              </div>

              <a
                href={tier.href}
                className={cn(
                  "mt-6 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0",
                  tier.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-foreground/15 bg-background text-foreground/80 hover:border-foreground/30"
                )}
              >
                {tier.cta}
              </a>

              <ul className="mt-7 space-y-3">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" strokeWidth={3} />
                    ) : (
                      <Minus className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground/25" />
                    )}
                    <span className={f.included ? "text-foreground/75" : "text-foreground/35"}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal as="p" className="mt-10 text-center text-sm text-foreground/45">
          No credit card to start free · Cancel Pro anytime · Secure checkout via Dodo Payments
        </Reveal>
      </div>
    </section>
  );
}
