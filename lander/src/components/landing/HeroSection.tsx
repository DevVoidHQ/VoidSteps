import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/Button";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 20, stiffness: 100 },
  },
};

/* ── Card content definitions ─────────────────────────────── */

const cardStyle = {
  border: "1px solid hsl(var(--foreground) / 0.08)",
  backgroundColor: "hsl(var(--card) / 0.7)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

function PathCard() {
  return (
    <div className="p-6 lg:p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
            My Learning Path
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">1 / 3</span>
      </div>
      <div className="space-y-3.5">
        {[
          { text: "Read Chapter 3", done: true },
          { text: "Build demo project", done: false, active: true },
          { text: "Write summary notes", done: false },
        ].map((step) => (
          <div key={step.text} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{
                border: `1.5px solid ${step.done ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.15)"}`,
                backgroundColor: step.done ? "hsl(var(--accent) / 0.15)" : "transparent",
              }}
            >
              {step.done && (
                <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${step.done ? "line-through text-muted-foreground" : ""}`}
              style={{ color: step.done ? undefined : "hsl(var(--foreground) / 0.75)" }}
            >
              {step.text}
            </span>
            {step.active && (
              <span
                className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
              >
                In Progress
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.06)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">Progress</span>
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--accent))" }}>33%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }}>
          <div className="h-full rounded-full bg-accent" style={{ width: "33%" }} />
        </div>
      </div>
    </div>
  );
}

function TimerCard() {
  return (
    <div className="p-6 lg:p-7">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus Timer</span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
      </div>
      <div className="text-center py-4">
        <div className="text-5xl font-bold font-mono" style={{ color: "hsl(var(--primary))" }}>
          24:38
        </div>
        <p className="text-xs text-muted-foreground mt-2">Deep work session</p>
      </div>
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.06)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">Session</span>
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>62%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }}>
          <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: "hsl(var(--primary) / 0.7)" }} />
        </div>
      </div>
    </div>
  );
}

function RoutineCard() {
  return (
    <div className="p-6 lg:p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.6)" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
            Daily Routine
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">2 / 3 done</span>
      </div>
      <div className="space-y-3.5">
        {[
          { text: "Morning review", done: true },
          { text: "Deep work block", done: true },
          { text: "Evening reflect", done: false },
        ].map((t) => (
          <div key={t.text} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                border: `1.5px solid ${t.done ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.15)"}`,
                backgroundColor: t.done ? "hsl(var(--primary) / 0.15)" : "transparent",
              }}
            >
              {t.done && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.7)" }} />
              )}
            </div>
            <span
              className={`text-sm ${t.done ? "text-muted-foreground" : ""}`}
              style={{ color: t.done ? undefined : "hsl(var(--foreground) / 0.75)" }}
            >
              {t.text}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.06)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">Today</span>
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>67%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }}>
          <div className="h-full rounded-full" style={{ width: "67%", backgroundColor: "hsl(var(--primary) / 0.7)" }} />
        </div>
      </div>
    </div>
  );
}

const cards: { key: string; content: ReactNode }[] = [
  { key: "path", content: <PathCard /> },
  { key: "timer", content: <TimerCard /> },
  { key: "routine", content: <RoutineCard /> },
];

/* ── Stack positions: front / middle / back ───────────────── */

const stackPositions = [
  { y: 0, scale: 1, rotate: 0, zIndex: 30, opacity: 1 },       // front
  { y: -18, scale: 0.95, rotate: 3, zIndex: 20, opacity: 0.7 }, // middle
  { y: -32, scale: 0.90, rotate: -2, zIndex: 10, opacity: 0.4 }, // back
];

function CardStack() {
  const [frontIndex, setFrontIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrontIndex((prev) => (prev + 1) % cards.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[380px] lg:max-w-[460px] h-[360px] lg:h-[420px]">
      {cards.map((card, i) => {
        const stackPos = (i - frontIndex + cards.length) % cards.length;
        const pos = stackPositions[stackPos];

        return (
          <motion.div
            key={card.key}
            className="absolute inset-x-0 top-0 rounded-2xl overflow-hidden will-change-transform"
            style={cardStyle}
            animate={{
              y: pos.y,
              scale: pos.scale,
              rotate: pos.rotate,
              zIndex: pos.zIndex,
              opacity: pos.opacity,
              boxShadow:
                stackPos === 0
                  ? "0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)"
                  : "0 8px 24px rgba(0,0,0,0.06)",
            }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 22,
              mass: 0.8,
            }}
          >
            {card.content}
          </motion.div>
        );
      })}

    </div>
  );
}

/* ── Hero Section ─────────────────────────────────────────── */

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.92]);
  const y = useTransform(scrollYProgress, [0, 0.8], [0, -80]);

  return (
    <section ref={ref} className="h-screen relative flex items-center justify-center px-6 md:px-12 lg:px-20 snap-section">
      <motion.div
        style={{ opacity, scale, y }}
        className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
      >
        {/* Left column — text content */}
        <motion.div
          className="md:col-span-5 flex flex-col items-start"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-xs font-medium text-accent mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Now in Beta
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight gradient-shimmer"
          >
            VoidSteps
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-3 text-lg md:text-xl text-primary/80 font-medium"
          >
            Your journey, step by step.
          </motion.p>

          <motion.p
            variants={item}
            className="mt-4 text-lg md:text-xl text-muted-foreground max-w-lg"
          >
            Track your paths and steps through your journey. Organize tasks,
            build routines, and stay focused — all offline-first.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <a href="https://app.voidsteps.com/login">
              <Button size="xl" className="btn-glow">
                Get Started
              </Button>
            </a>
            <a href="#how-it-works">
              <Button size="xl" variant="outline">
                Learn More
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Right column — shuffling card stack (md+ only) */}
        <motion.div
          className="hidden md:flex md:col-span-7 items-center justify-center pt-16 lg:pt-24"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 80, delay: 0.6 }}
        >
          <CardStack />
        </motion.div>
      </motion.div>

      {/* Scroll indicator — centered bottom */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
