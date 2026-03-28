import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        className="h-[3px] bg-primary origin-left"
        style={{ scaleX }}
      />
    </div>
  );
}
