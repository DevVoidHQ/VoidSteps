import { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "./Reveal";

const faqs = [
  {
    q: "How is this different from a normal to-do app?",
    a: "Most to-do apps give you flat lists. VoidSteps organizes work into paths: goal-shaped containers with ordered, nestable steps, routines, and a focus timer. And it's offline-first, so it opens and works instantly with no connection.",
  },
  {
    q: "Does it really work offline?",
    a: "Yes. Everything is stored on your device first, so you can add and complete steps with zero connection. When you're back online it syncs automatically, once a day on Free, in real time on Pro.",
  },
  {
    q: "Is my data safe and private?",
    a: "Your data lives on your device and you can export it anytime. We don't sell it, run ads against it, or train anything on it. No social feeds, no third-party trackers.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free is a complete tracker: unlimited paths, steps, routines, themes, and daily sync. Pro adds real-time sync across devices, notes & notebooks, and full analytics. Lifetime is the same as Pro, paid once.",
  },
  {
    q: "Why is pricing different for India?",
    a: "Pricing is adjusted by region so it's fair to local purchasing power. Your country is detected automatically. Pro is ₹499/mo in India and $10/mo elsewhere.",
  },
  {
    q: "How long does it take to get started?",
    a: "Under a minute. Open the app, create your first path, add a few steps. No setup, no onboarding wizard, no credit card.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-foreground/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-semibold md:text-lg">{q}</span>
        <Plus
          className={`h-5 w-5 flex-shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        />
      </button>
      <div
        className="grid transition-all duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 leading-relaxed text-foreground/60">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary/60">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Questions, answered</h2>
        </Reveal>
        <Reveal>
          {faqs.map((f) => (
            <Item key={f.q} {...f} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
