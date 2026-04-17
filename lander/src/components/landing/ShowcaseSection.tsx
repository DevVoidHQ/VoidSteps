import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function DetailCard({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const y = useTransform(scrollYProgress, [0, 1], [80, -40]);

  return (
    <motion.div
      className="hidden md:block absolute -bottom-8 -left-8 lg:-left-12 w-52 lg:w-60 z-10"
      style={{ y }}
    >
      <div
        className="rounded-lg backdrop-blur-md shadow-lg p-5"
        style={{
          border: "1px solid hsl(var(--primary) / 0.2)",
          backgroundColor: "hsl(var(--card) / 0.7)",
          boxShadow: "0 25px 50px -12px hsl(var(--primary) / 0.1)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">
            Focus Timer
          </span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="text-3xl lg:text-4xl font-bold mb-3 font-mono" style={{ color: "hsl(var(--foreground))" }}>
          24:38
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "hsl(var(--foreground) / 0.08)" }}
        >
          <div className="h-full w-3/5 rounded-full bg-primary" style={{ opacity: 0.6 }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Deep work session
        </p>
      </div>
    </motion.div>
  );
}

function RoutineFloatingCard({
  scrollYProgress,
}: {
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const y = useTransform(scrollYProgress, [0, 1], [-40, 60]);

  return (
    <motion.div
      className="hidden lg:block absolute -top-6 -right-6 xl:-right-10 w-48 z-10"
      style={{ y }}
    >
      <div
        className="rounded-lg backdrop-blur-md shadow-lg p-4"
        style={{
          border: "1px solid hsl(var(--accent) / 0.15)",
          backgroundColor: "hsl(var(--card) / 0.7)",
          boxShadow: "0 20px 40px -12px hsl(var(--accent) / 0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">
            Morning Routine
          </span>
          <span className="text-[9px] text-muted-foreground">2/3</span>
        </div>
        <div className="space-y-2">
          {[
            { text: "Review goals", done: true },
            { text: "Deep work block", done: true },
            { text: "Evening reflect", done: false },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  border: `1.5px solid ${item.done ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.15)"}`,
                  backgroundColor: item.done ? "hsl(var(--primary) / 0.15)" : "transparent",
                }}
              >
                {item.done && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.7)" }} />
                )}
              </div>
              <span className={`text-[11px] ${item.done ? "text-muted-foreground" : "text-foreground/70"}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MockupSidebar() {
  const paths = [
    { name: "Learning React", active: true, color: "hsl(var(--primary))" },
    { name: "Fitness Goals", active: false, color: "hsl(var(--accent))" },
    { name: "Side Project", active: false, color: "hsl(var(--primary) / 0.6)" },
    { name: "Reading List", active: false, color: "hsl(var(--accent) / 0.6)" },
  ];

  return (
    <div className="w-52 hidden md:flex flex-col border-r pr-6" style={{ borderColor: "hsl(var(--foreground) / 0.06)" }}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 px-2">
        Paths
      </div>
      <div className="space-y-1.5 flex-1">
        {paths.map((path) => (
          <div
            key={path.name}
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-xs"
            style={{
              backgroundColor: path.active ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: path.active ? "hsl(var(--foreground) / 0.9)" : "hsl(var(--foreground) / 0.5)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: path.color }}
            />
            {path.name}
          </div>
        ))}
      </div>

      {/* Sidebar footer — timer shortcut */}
      <div className="mt-auto pt-4" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.05)" }}>
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-muted-foreground">Timer running</span>
        </div>
        <div className="text-lg font-bold font-mono mt-1 px-2" style={{ color: "hsl(var(--primary))" }}>
          24:38
        </div>
      </div>
    </div>
  );
}

function MockupContent() {
  const steps = [
    { text: "Read Chapter 3", done: true },
    { text: "Build demo project", done: false, active: true },
    { text: "Write summary notes", done: false },
    { text: "Review with mentor", done: false },
    { text: "Publish blog post", done: false },
    { text: "Gather feedback", done: false },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h4 className="text-base font-semibold" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
          Learning React
        </h4>
        <span
          className="text-[9px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
        >
          1/6 steps
        </span>
      </div>

      {/* Steps list */}
      <div className="space-y-3.5 flex-1">
        {steps.map((step) => (
          <div key={step.text} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{
                border: `1.5px solid ${step.done ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.12)"}`,
                backgroundColor: step.done ? "hsl(var(--primary) / 0.15)" : "transparent",
              }}
            >
              {step.done && (
                <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${step.done ? "line-through text-muted-foreground" : ""}`}
              style={{ color: step.done ? undefined : "hsl(var(--foreground) / 0.7)" }}
            >
              {step.text}
            </span>
            {step.active && (
              <span
                className="ml-auto text-[8px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
              >
                In Progress
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="pt-4 mt-6" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.05)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">Progress</span>
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>17%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }}>
          <div className="h-full rounded-full bg-primary" style={{ width: "17%" }} />
        </div>
      </div>
    </div>
  );
}

export default function ShowcaseSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [6, 0, 0, -4]);
  const rotateY = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [-3, 0, 0, 2]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.92, 1, 1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.3, 1, 1, 0.3]);

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 md:px-12 lg:px-20 snap-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
        >
          <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "hsl(var(--primary) / 0.6)" }}>
            The Interface
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Designed for focus
          </h2>
        </motion.div>

        <div className="relative ml-auto w-full md:w-[85%]" style={{ perspective: 1200 }}>
          <DetailCard scrollYProgress={scrollYProgress} />
          <RoutineFloatingCard scrollYProgress={scrollYProgress} />

          <motion.div
            className="relative rounded-lg overflow-hidden"
            style={{
              rotateX,
              rotateY,
              scale,
              opacity,
              willChange: "transform",
              border: "1px solid hsl(var(--foreground) / 0.08)",
              backgroundColor: "hsl(var(--card) / 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px hsl(var(--primary) / 0.05), inset 0 1px 0 hsl(var(--foreground) / 0.05)",
            }}
          >
            {/* Subtle dot pattern inside mockup */}
            <div className="absolute inset-0 dot-pattern opacity-[0.03] pointer-events-none" />

            <div className="p-8 md:p-12 lg:p-14 relative">
              {/* Window chrome */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0 60% 60% / 0.6)" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45 80% 55% / 0.6)" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142 60% 45% / 0.6)" }} />
                <span className="ml-4 text-sm text-muted-foreground">
                  VoidSteps
                </span>
              </div>

              {/* App mockup content */}
              <div className="flex gap-8">
                <MockupSidebar />
                <MockupContent />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
