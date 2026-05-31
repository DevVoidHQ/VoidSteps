import Reveal from "./Reveal";

const principles = [
  {
    title: "Offline-first, not offline-maybe",
    body: "Most apps treat offline as a degraded mode. VoidSteps is built the other way around: local first, sync second.",
  },
  {
    title: "Your data is yours",
    body: "It lives on your device. Export it whenever you like. No selling, no training, no lock-in.",
  },
  {
    title: "Focus means saying no",
    body: "No social feeds, no notifications from strangers, no dark patterns. Just you and your goals.",
  },
];

export default function PrinciplesSection() {
  return (
    <section className="px-6 py-24 md:py-28">
      <div className="mx-auto max-w-6xl rounded-3xl bg-primary px-8 py-16 text-primary-foreground md:px-16 md:py-20">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">
            Why VoidSteps
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
            Built on a few stubborn beliefs.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <h3 className="text-lg font-bold">{p.title}</h3>
              <p className="mt-2.5 leading-relaxed text-primary-foreground/70">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
