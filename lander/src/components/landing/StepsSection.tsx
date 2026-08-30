import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const STAGES = [
  {
    title: "Name the goal",
    body: "A path is one outcome you actually care about. Learn Spanish. Ship the launch. Run the half.",
    tint: "bg-accent",
    ink: "text-background",
  },
  {
    title: "Break it down once",
    body: "Ordered steps, nested where the work is deep, dated only where a date is real. One line each.",
    tint: "bg-background",
    ink: "text-foreground",
  },
  {
    title: "Then just show up",
    body: "Today shows the next thing and nothing else. The timer runs, the log fills, the path closes behind you.",
    tint: "bg-primary",
    ink: "text-background",
  },
];

/** Three chunky cards, alternating colour, tilted slightly out of the grid. */
export default function StepsSection() {
  const reduce = useReducedMotion();

  return (
    <section id="how" className="relative overflow-hidden bg-surface px-5 py-20 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1500px]">
        <h2 className="font-display max-w-[14ch] text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
          Three moves, then it runs itself
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 44 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : i * 0.12, ease: EASE }}
              className={`${s.tint} ${s.ink} rounded-[2rem] p-9 transition-transform duration-300 hover:-translate-y-2 ${i % 2 === 0 ? "md:-rotate-1" : "md:rotate-1"}`}

            >
              <span className="font-hand text-3xl opacity-70">0{i + 1}</span>
              <h3 className="font-display mt-5 text-3xl leading-[1.05]">{s.title}</h3>
              <p className="mt-4 text-base font-bold leading-relaxed opacity-80">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
