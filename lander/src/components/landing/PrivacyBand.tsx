import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One loud claim on a full colour field. The reason the product exists.
 *
 * Deliberately no shape behind it: a blob on navy sat too close in value to
 * read as a drawn form, so it looked like a rendering artefact rather than a
 * decision. Flat navy, and the type carries it.
 */
export default function PrivacyBand() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-primary px-5 py-24 lg:mx-6 lg:rounded-[3rem] lg:px-12 lg:py-36">
      <div className="relative mx-auto max-w-[1100px] text-center">
        <motion.h2
          {...rise(0)}
          className="font-display text-[clamp(2.3rem,6.4vw,5.4rem)] leading-[0.96] text-background"
        >
          Your data never leaves the machine it was typed on
        </motion.h2>

        <motion.p
          {...rise(0.08)}
          className="mx-auto mt-8 max-w-[50ch] text-base font-bold leading-relaxed text-background/70 lg:text-lg"
        >
          No account to make, no server to trust, no analytics watching you
          work. Not a setting you switch on. The only way it was built.
        </motion.p>

        <motion.p
          {...rise(0.14)}
          className="mx-auto mt-5 max-w-[50ch] text-base font-bold leading-relaxed text-background/70 lg:text-lg"
        >
          There is no server, so there is nothing to run and nothing to sell.
          Syncing between your own machines will cost money one day. The app
          will not.
        </motion.p>

        <motion.span
          {...rise(0.2)}
          className="font-hand mt-10 inline-block text-2xl text-accent-light lg:text-3xl"
        >
          back it up to one file, whenever you like
        </motion.span>
      </div>
    </section>
  );
}
