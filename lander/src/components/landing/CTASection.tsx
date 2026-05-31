import Reveal from "./Reveal";

const APP_URL = "https://app.voidsteps.com/login";

export default function CTASection() {
  return (
    <section className="px-6 pb-28">
      <div className="dot-grid relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-foreground/10 bg-accent-light px-8 py-20 text-center md:py-24">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight md:text-[2.75rem]">
            Take the first step today.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-foreground/55">
            Your goals, one clear path at a time. Free to start, no account, no
            credit card.
          </p>
          <a
            href={APP_URL}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start free
          </a>
        </Reveal>
      </div>
    </section>
  );
}
