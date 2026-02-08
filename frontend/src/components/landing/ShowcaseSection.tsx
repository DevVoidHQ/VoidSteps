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
        className="rounded-2xl backdrop-blur-md shadow-2xl p-5"
        style={{
          border: "1px solid hsl(var(--primary) / 0.25)",
          backgroundColor: "hsl(var(--background) / 0.9)",
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
    <section ref={ref} className="py-24 md:py-32 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        {/* Asymmetric section label */}
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

        {/* Main mockup — offset right */}
        <div className="relative ml-auto w-full md:w-[85%]" style={{ perspective: 1200 }}>
          <DetailCard scrollYProgress={scrollYProgress} />

          <motion.div
            className="relative rounded-2xl overflow-hidden"
            style={{
              rotateX,
              rotateY,
              scale,
              opacity,
              border: "1px solid hsl(var(--foreground) / 0.1)",
              backgroundColor: "hsl(var(--background))",
              boxShadow: "0 10px 40px hsl(var(--primary) / 0.05)",
            }}
          >
            <div className="p-6 md:p-10 lg:p-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0 60% 60% / 0.6)" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45 80% 55% / 0.6)" }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142 60% 45% / 0.6)" }} />
                <span className="ml-4 text-sm text-muted-foreground">
                  VoidSteps
                </span>
              </div>

              <div className="flex gap-6">
                <div className="w-48 space-y-3 hidden md:block">
                  <div className="h-8 rounded w-full" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }} />
                  <div className="h-6 rounded w-3/4" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }} />
                  <div className="h-6 rounded w-5/6" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }} />
                  <div className="h-6 rounded w-full" style={{ backgroundColor: "hsl(var(--primary) / 0.15)" }} />
                  <div className="h-6 rounded w-2/3" style={{ backgroundColor: "hsl(var(--foreground) / 0.06)" }} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="h-10 rounded w-2/3" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }} />
                  <div className="h-6 rounded w-full" style={{ backgroundColor: "hsl(var(--foreground) / 0.05)" }} />
                  <div className="h-6 rounded w-5/6" style={{ backgroundColor: "hsl(var(--foreground) / 0.05)" }} />
                  <div className="flex gap-3 mt-4">
                    <div
                      className="h-20 rounded-lg flex-1"
                      style={{
                        backgroundColor: "hsl(var(--primary) / 0.08)",
                        border: "1px solid hsl(var(--primary) / 0.15)",
                      }}
                    />
                    <div
                      className="h-20 rounded-lg flex-1"
                      style={{
                        backgroundColor: "hsl(var(--foreground) / 0.03)",
                        border: "1px solid hsl(var(--foreground) / 0.08)",
                      }}
                    />
                    <div
                      className="h-20 rounded-lg flex-1"
                      style={{
                        backgroundColor: "hsl(var(--foreground) / 0.03)",
                        border: "1px solid hsl(var(--foreground) / 0.08)",
                      }}
                    />
                  </div>
                  <div className="h-6 rounded w-4/5 mt-3" style={{ backgroundColor: "hsl(var(--foreground) / 0.05)" }} />
                  <div className="h-6 rounded w-3/5" style={{ backgroundColor: "hsl(var(--foreground) / 0.05)" }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
