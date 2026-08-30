import { motion, useReducedMotion } from "motion/react";
import { ACCESS_LABEL, ACCESS_URL } from "../../lib/links";
import Blob from "./Blob";
import { PathArt } from "./Art";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HeroSection() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease: EASE },
  });

  return (
    <section id="top" className="relative overflow-hidden rounded-b-[3rem] bg-background">
      <Blob shape="a" fill="fill-accent" className="hidden lg:block" />
      <Blob shape="b" fill="fill-accent-light" className="hidden lg:block" />

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-8 px-5 pb-14 pt-28 lg:grid-cols-[1.05fr_1fr] lg:px-12 lg:pb-24 lg:pt-36">
        <div>
          <motion.h1
            {...rise(0.05)}
            className="font-display text-[clamp(3rem,7.4vw,6.6rem)] leading-[0.92] text-foreground"
          >
            Everything you owe yourself, in order
          </motion.h1>

          <motion.p
            {...rise(0.18)}
            className="mt-8 max-w-[38ch] text-lg font-bold leading-relaxed text-foreground/75"
          >
            A desktop app that turns scattered work into one ordered path.
            No account. No server. Nothing ever leaves your machine.
          </motion.p>

          <motion.div {...rise(0.3)} className="mt-10 flex flex-wrap items-center gap-5">
            <a
              href={ACCESS_URL}
              className="group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 text-base font-bold text-accent-foreground shadow-[0_6px_0_0_hsl(var(--foreground))] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-[6px] active:shadow-none"
            >
              {ACCESS_LABEL}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </a>
            <span className="font-hand text-2xl text-primary">
              free, for mac &amp; windows
            </span>
          </motion.div>
        </div>

        {/* The idea as a drawing. A product film replaces this later. */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.2, ease: EASE }}
          className="relative mt-8 rounded-[2rem] bg-accent-light px-5 py-8 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <PathArt className="w-full drop-shadow-[0_28px_40px_rgba(20,16,10,0.18)]" />
          </motion.div>

          <span className="font-hand absolute bottom-3 right-6 text-xl text-primary lg:-bottom-2 lg:right-16 lg:text-2xl">
            one thing at a time
          </span>
        </motion.div>

      </div>
    </section>
  );
}
