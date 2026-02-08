import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

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
    const fadeInEnd = start + seg * 0.2;
    const fadeOutStart = start + seg * 0.8;
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
    const fadeInEnd = start + seg * 0.2;
    const fadeOutStart = start + seg * 0.8;
    const end = start + seg;

    if (v <= start) return 40;
    if (v <= fadeInEnd) return 40 * (1 - (v - start) / (fadeInEnd - start));
    if (v <= fadeOutStart) return 0;
    if (isLast) return 0;
    if (v <= end) return -30 * ((v - fadeOutStart) / (end - fadeOutStart));
    return -30;
  });

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ opacity, y }}
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

function ProgressLine({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const height = useTransform(scrollYProgress, (v: number) => `${v * 100}%`);

  return (
    <div className="hidden md:block absolute left-6 lg:left-12 top-1/4 bottom-1/4">
      <div
        className="relative w-px h-full"
        style={{ backgroundColor: "hsl(var(--foreground) / 0.1)" }}
      >
        <motion.div
          className="absolute top-0 left-0 w-full bg-primary"
          style={{ height }}
        />
        {statements.map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-background"
            style={{
              top: `${(i / (statements.length - 1)) * 100}%`,
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PhilosophySection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <section ref={ref} className="relative h-[300vh]">
      {/* Diagonal divider at top */}
      <div
        className="absolute top-0 left-0 right-0 h-24 z-10"
        style={{
          backgroundColor: "hsl(var(--background))",
          clipPath: "polygon(0 0, 100% 0, 100% 30%, 0 100%)",
        }}
      />

      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 relative">
          <ProgressLine scrollYProgress={scrollYProgress} />

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
