import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const statements = [
  {
    number: "01",
    title: "Paths, not lists",
    description:
      "Tasks need direction. VoidSteps organizes your work into meaningful paths — not scattered to-do lists that go nowhere.",
  },
  {
    number: "02",
    title: "Offline by default",
    description:
      "No Wi-Fi? No problem. Your data lives on your device first, syncing seamlessly when you're back online.",
  },
  {
    number: "03",
    title: "Focus over features",
    description:
      "We don't add features for the sake of it. Every tool exists to help you focus — nothing more, nothing less.",
  },
];

const TOTAL = statements.length;

function StatementBlock({
  statement,
  index,
  scrollYProgress,
}: {
  statement: (typeof statements)[number];
  index: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const isLast = index === TOTAL - 1;

  const opacity = useTransform(scrollYProgress, (v: number) => {
    const seg = 1 / TOTAL;
    const start = index * seg;
    const fadeInEnd = start + seg * 0.3;
    const fadeOutStart = start + seg * 0.65;
    const end = start + seg;

    if (v <= start) return 0;
    if (v <= fadeInEnd) return (v - start) / (fadeInEnd - start);
    if (v <= fadeOutStart) return 1;
    if (isLast) return 1;
    if (v <= end) return 1 - (v - fadeOutStart) / (end - fadeOutStart);
    return 0;
  });

  const y = useTransform(scrollYProgress, (v: number) => {
    const seg = 1 / TOTAL;
    const start = index * seg;
    const fadeInEnd = start + seg * 0.3;
    const fadeOutStart = start + seg * 0.65;
    const end = start + seg;

    if (v <= start) return 40;
    if (v <= fadeInEnd) return 40 * (1 - (v - start) / (fadeInEnd - start));
    if (v <= fadeOutStart) return 0;
    if (isLast) return 0;
    if (v <= end) return -30 * ((v - fadeOutStart) / (end - fadeOutStart));
    return -30;
  });

  const scale = useTransform(scrollYProgress, (v: number) => {
    const seg = 1 / TOTAL;
    const start = index * seg;
    const fadeInEnd = start + seg * 0.3;
    const fadeOutStart = start + seg * 0.65;
    const end = start + seg;

    if (v <= start) return 0.97;
    if (v <= fadeInEnd) return 0.97 + 0.03 * ((v - start) / (fadeInEnd - start));
    if (v <= fadeOutStart) return 1;
    if (isLast) return 1;
    if (v <= end) return 1 - 0.02 * ((v - fadeOutStart) / (end - fadeOutStart));
    return 0.98;
  });

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ opacity, y, scale }}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full items-center">
        {/* Left — watermark number */}
        <div className="hidden md:flex md:col-span-2 justify-end pr-8">
          <span
            className="text-7xl lg:text-9xl font-bold select-none"
            style={{ color: "hsl(var(--foreground) / 0.07)" }}
          >
            {statement.number}
          </span>
        </div>

        {/* Right — text content, offset */}
        <div className="md:col-span-8 md:col-start-4">
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {statement.title}
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
            {statement.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function PhilosophySection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: rawProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const scrollYProgress = useSpring(rawProgress, { stiffness: 100, damping: 30 });

  return (
    <section ref={ref} id="philosophy" className="relative h-[300vh]">
      {/* Snap anchors — one per statement */}
      {statements.map((_, i) => (
        <div
          key={i}
          className="absolute w-full h-px snap-section"
          style={{ top: `${(i / TOTAL) * 100}%` }}
        />
      ))}
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 relative">
          <div className="relative h-[200px] md:h-[250px]">
            {statements.map((statement, i) => (
              <StatementBlock
                key={statement.number}
                statement={statement}
                index={i}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
