import { motion, useScroll, useSpring } from "framer-motion";

const sections = [
  { label: "Hero", position: 0 },
  { label: "Philosophy", position: 14 },
  { label: "How", position: 30 },
  { label: "Showcase", position: 50 },
  { label: "Features", position: 65 },
  { label: "Social", position: 78 },
  { label: "CTA", position: 90 },
];

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        className="h-[3px] bg-primary origin-left"
        style={{ scaleX }}
      />
      {/* Section markers */}
      <div className="absolute top-0 left-0 right-0 h-[3px]">
        {sections.map((section) => (
          <div
            key={section.label}
            className="absolute top-0 w-px h-2 bg-primary/20"
            style={{ left: `${section.position}%` }}
          />
        ))}
      </div>
    </div>
  );
}
