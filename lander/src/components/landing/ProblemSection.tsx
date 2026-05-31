import Reveal from "./Reveal";

export default function ProblemSection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal as="p" className="text-sm font-semibold uppercase tracking-widest text-primary/60">
          The problem
        </Reveal>
        <Reveal
          as="h2"
          delay={60}
          className="mt-3 text-3xl font-bold leading-tight md:text-4xl lg:text-[2.75rem]"
        >
          Your goals are scattered across ten apps,
          <span className="text-foreground/40"> and none of them keep up.</span>
        </Reveal>
        <Reveal as="p" delay={120} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-foreground/55">
          Notes here, a to-do app there, a habit tracker you forgot about. Half
          of them need Wi-Fi to even open. By the time you find your next step,
          the momentum is gone, and so is the focus.
        </Reveal>
      </div>
    </section>
  );
}
