import Reveal from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Create a path",
    body: "Pick a goal: learn a language, ship a project, get fit. Each path is a focused container for everything it takes.",
  },
  {
    n: "02",
    title: "Break it into steps",
    body: "Add ordered steps, set priorities and due dates, drag to reorder. Nest steps for the goals that need more structure.",
  },
  {
    n: "03",
    title: "Show up and track",
    body: "Run a focus session, check off steps, keep your routines. Progress fills in automatically, online or off.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary/60">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            From a vague goal to your next step, in under a minute.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className="bg-background p-8 md:p-10">
              <span className="text-sm font-bold text-accent">{s.n}</span>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-2.5 leading-relaxed text-foreground/55">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
