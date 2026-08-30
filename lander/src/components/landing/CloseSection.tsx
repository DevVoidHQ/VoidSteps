import { motion, useReducedMotion } from "motion/react";
import { ACCESS_LABEL, ACCESS_URL } from "../../lib/links";

/** The end: one line, one big pill, one note. No footer bar. */
export default function CloseSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative px-6 py-32 text-center lg:px-12 lg:py-44">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[900px]"
      >
        <h2 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.94]">
          Start the first path tonight
        </h2>

        <a
          href={ACCESS_URL}
          className="group mt-12 inline-flex items-center gap-3 rounded-full bg-accent px-10 py-5 text-lg font-bold text-accent-foreground shadow-[0_7px_0_0_hsl(var(--foreground))] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-[7px] active:shadow-none"
        >
          {ACCESS_LABEL}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </a>

        <p className="mx-auto mt-8 max-w-[46ch] text-base font-bold leading-relaxed text-foreground/55">
          Send me a note and I will pass you a copy, usually same day. There
          is no download button yet because the build is not signed, so this
          is the way in for now.
        </p>

        <p className="font-hand mx-auto mt-10 max-w-[34ch] text-2xl text-primary">
          I built it because I wanted it, and I have used it every day since
        </p>

        <p className="mt-20 text-xs font-bold uppercase tracking-[0.14em] text-foreground/30">
          VoidSteps, a{" "}
          <a
            href="https://devvoid.org"
            className="underline decoration-foreground/20 underline-offset-4 transition-colors duration-200 hover:text-foreground/60 hover:decoration-foreground/40"
          >
            DevVoid
          </a>{" "}
          product
        </p>
      </motion.div>
    </section>
  );
}
