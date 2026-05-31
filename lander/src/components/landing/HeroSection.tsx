import Reveal from "./Reveal";
import { VoidStepsMark } from "./Wordmark";
import { Check, WifiOff } from "lucide-react";

const APP_URL = "https://app.voidsteps.com/login";

const steps = [
  { text: "Read the research paper", done: true },
  { text: "Outline the argument", done: true },
  { text: "Write first draft", done: false, active: true },
  { text: "Edit & publish", done: false },
];

function ProductMock() {
  return (
    <div className="relative">
      {/* soft brand glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary-light to-accent-light opacity-60 blur-2xl"
      />
      <div className="rounded-2xl border border-foreground/10 bg-background shadow-[0_24px_60px_-20px_rgba(8,50,145,0.25)]">
        <div className="flex items-center gap-2 border-b border-foreground/[0.07] px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/40">
            <WifiOff className="h-3 w-3" /> Working offline
          </span>
        </div>

        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="text-sm font-semibold">Write my essay</span>
            </div>
            <span className="text-xs text-foreground/40">2 / 4</span>
          </div>

          <div className="space-y-3.5">
            {steps.map((s) => (
              <div key={s.text} className="flex items-center gap-3">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-[1.5px]"
                  style={{
                    borderColor: s.done ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.18)",
                    backgroundColor: s.done ? "hsl(var(--accent) / 0.15)" : "transparent",
                  }}
                >
                  {s.done && <Check className="h-3 w-3 text-accent" strokeWidth={3} />}
                </span>
                <span
                  className={`text-sm ${s.done ? "text-foreground/40 line-through" : "text-foreground/80"}`}
                >
                  {s.text}
                </span>
                {s.active && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    In progress
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-foreground/[0.06] pt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-foreground/40">Progress</span>
              <span className="font-semibold text-accent">50%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div className="h-full rounded-full bg-accent" style={{ width: "50%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section id="top" className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2 md:gap-12">
        {/* Left: copy */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background px-3 py-1 text-xs font-medium text-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Offline-first · Private by default
            </span>
          </Reveal>

          <Reveal as="h1" delay={60} className="mt-5 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Your goals, one
            <br className="hidden sm:block" /> clear{" "}
            <span className="text-primary">path</span> at a time.
          </Reveal>

          <Reveal as="p" delay={120} className="mt-5 max-w-md text-lg leading-relaxed text-foreground/60">
            <VoidStepsMark className="text-foreground/80" /> turns scattered
            to-dos into focused paths, so you always know your next step. Works
            fully offline. Your data lives on your device.
          </Reveal>

          <Reveal delay={180} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={APP_URL}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-7 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
            >
              Start free
            </a>
            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-foreground/15 bg-background px-7 text-base font-semibold text-foreground/80 transition-all hover:border-foreground/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              See how it works
            </a>
          </Reveal>

          <Reveal as="p" delay={240} className="mt-5 text-sm text-foreground/45">
            Free forever, no account needed to start. No credit card.
          </Reveal>
        </div>

        {/* Right: product mock */}
        <Reveal delay={150} className="md:pl-4">
          <ProductMock />
        </Reveal>
      </div>
    </section>
  );
}
