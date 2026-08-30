import { motion, useReducedMotion } from "motion/react";
import { StepsArt, MonthArt, TimeArt } from "./Art";

const EASE = [0.16, 1, 0.3, 1] as const;

const CARDS = [
  {
    Art: StepsArt,
    title: "Every step, in order",
    note: "nested as deep as the work goes",
    tint: "bg-primary",
    ink: "text-background",
    tilt: "md:-rotate-2",
  },
  {
    Art: MonthArt,
    title: "The whole month",
    note: "routines show up on their own",
    tint: "bg-accent",
    ink: "text-background",
    tilt: "md:rotate-2",
  },
  {
    Art: TimeArt,
    title: "Where the time went",
    note: "counted while you worked",
    tint: "bg-foreground",
    ink: "text-background",
    tilt: "md:-rotate-1",
  },
];

/** The product as a set of tilted cards, each sitting on its own colour. */
export default function ShowcaseSection() {
  const reduce = useReducedMotion();

  return (
    <section id="what" className="relative px-5 py-20 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1500px]">
        <div className="relative mb-16 text-center">
          <span className="font-hand absolute -top-10 left-[8%] hidden text-2xl text-primary lg:block">
            no accounts, no cloud, no waiting
          </span>
          <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
            <span className="block">What you</span>
            <span className="block">actually get</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : i * 0.1, ease: EASE }}
            >
              <div
                className={`${c.tint} ${c.ink} ${c.tilt} rounded-[2rem] p-8 transition-transform duration-300 hover:-translate-y-2`}

              >
                <c.Art className="w-full" />
                <h3 className="font-display mt-8 text-2xl">{c.title}</h3>
                <p className="font-hand mt-1 text-xl opacity-80">{c.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
