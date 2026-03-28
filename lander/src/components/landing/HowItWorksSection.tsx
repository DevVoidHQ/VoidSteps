import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const steps = [
  {
    title: "Define your paths",
    description:
      "Create paths that represent your goals — career, fitness, learning, or anything you want to pursue. Each path becomes a container for focused progress.",
  },
  {
    title: "Break them into steps",
    description:
      "Add actionable steps to each path. Set priorities, due dates, and organize with drag-and-drop. Nest steps for complex goals that need structure.",
  },
  {
    title: "Track & stay focused",
    description:
      "Use the focus timer, build routines, and watch your progress grow — even offline. Stay in the zone with a distraction-free interface.",
  },
];

const STEP_COUNT = steps.length;

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const snappedX = useTransform(scrollYProgress, (v: number) => {
    const stepProgress = v * (STEP_COUNT - 1);
    const snappedStep = Math.round(stepProgress);
    return -snappedStep * 100;
  });

  const smoothX = useSpring(snappedX, {
    stiffness: 60,
    damping: 25,
    mass: 1,
  });

  const x = useTransform(smoothX, (v: number) => `${v}vw`);

  return (
    <section ref={ref} className="h-[200vh] md:h-[300vh] relative">
      {steps.map((_, i) => (
        <div
          key={i}
          className="absolute w-full h-px snap-section"
          style={{ top: `${(i / STEP_COUNT) * 100}%` }}
        />
      ))}
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="flex h-full items-center"
          style={{ x, willChange: "transform" }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="w-screen flex-shrink-0 h-full flex items-center px-6 md:px-12 lg:px-20"
            >
              <div className="max-w-7xl mx-auto w-full">
                <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "hsl(var(--primary) / 0.6)" }} {...(i === 0 ? { id: "how-it-works" } : {})}>
                  How it works
                </p>
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
