import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@devvoid/ui";

export default function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const textScale = useTransform(scrollYProgress, [0, 1], [0.7, 1]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0.5, 1]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [0.3, 1.5]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.3, 0.8]);

  return (
    <section
      ref={ref}
      className="min-h-screen flex items-center justify-center px-6 text-center relative overflow-hidden"
    >
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />

      {/* Background glow blob */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ scale: glowScale, opacity: glowOpacity }}
      >
        <div className="w-[600px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
      </motion.div>

      <motion.div
        className="relative z-10"
        style={{ scale: textScale, opacity: textOpacity }}
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          Ready to take your{" "}
          <span className="gradient-shimmer">first step?</span>
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-md mx-auto">
          Join the beta and start building your paths today.
        </p>
        <Link to="/login">
          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Button size="xl" className="btn-glow px-16 text-lg">
              Get Started
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </section>
  );
}
