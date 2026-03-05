import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Define your paths",
    description:
      "Create paths that represent your goals — career, fitness, learning, or anything you want to pursue. Each path becomes a container for focused progress.",
    accent: "from-primary/20 to-transparent",
  },
  {
    number: "02",
    title: "Break them into steps",
    description:
      "Add actionable steps to each path. Set priorities, due dates, and organize with drag-and-drop. Nest steps for complex goals that need structure.",
    accent: "from-secondary/20 to-transparent",
  },
  {
    number: "03",
    title: "Track & stay focused",
    description:
      "Use the focus timer, build routines, and watch your progress grow — even offline. Stay in the zone with a distraction-free interface.",
    accent: "from-accent/20 to-transparent",
  },
];

function ProgressBar({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-6 md:px-12 lg:px-20 pt-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-4" id="how-it-works">
          How it works
        </h2>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width }}
          />
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const x = useTransform(scrollYProgress, (latest: number) => {
    return `${-latest * (steps.length - 1) * 100}vw`;
  });

  return (
    <section ref={ref} className="h-[200vh] md:h-[300vh] relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        <ProgressBar scrollYProgress={scrollYProgress} />

        <motion.div
          className="flex h-full items-center pt-16"
          style={{ x }}
        >
          {steps.map((step) => (
            <div
              key={step.number}
              className="w-screen flex-shrink-0 h-full flex items-center px-6 md:px-12 lg:px-20"
            >
              <div className="max-w-7xl mx-auto w-full">
                <span
                  className="text-sm font-semibold uppercase tracking-widest mb-4 block"
                  style={{ color: "hsl(var(--primary) / 0.5)" }}
                >
                  {step.number}
                </span>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  {step.title}
                </h3>
                <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
