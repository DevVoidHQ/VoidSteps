import Reveal from "./Reveal";
import { Route, WifiOff, Timer, type LucideIcon } from "lucide-react";

const benefits: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Route,
    title: "Always know your next step",
    body: "Turn any goal into a path of clear, ordered steps. Nest them, prioritize, and watch progress fill in as you go.",
  },
  {
    icon: WifiOff,
    title: "Never blocked by a bad connection",
    body: "Everything lives on your device first. Add steps on a plane, in a tunnel, anywhere. It syncs the moment you're back.",
  },
  {
    icon: Timer,
    title: "Focus that compounds",
    body: "A built-in focus timer and recurring routines keep you showing up. Distraction-free, no feeds, no noise.",
  },
];

export default function BenefitsSection() {
  return (
    <section className="px-6 pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 80}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{b.title}</h3>
              <p className="mt-2.5 leading-relaxed text-foreground/55">{b.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
