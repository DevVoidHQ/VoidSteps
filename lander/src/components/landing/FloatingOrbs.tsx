import { motion, useScroll, useTransform } from "framer-motion";

const orbData = [
  {
    color: "bg-primary/15",
    size: "w-[350px] h-[350px]",
    position: "top-[5%] left-[-5%]",
    animate: {
      x: ["-100px", "80px", "-100px"],
      y: ["-50px", "60px", "-50px"],
    },
    duration: 22,
    scrollMultiplier: -0.08,
  },
  {
    color: "bg-secondary/15",
    size: "w-[500px] h-[500px]",
    position: "top-[15%] right-[-10%]",
    animate: {
      x: ["200px", "50px", "200px"],
      y: ["100px", "-80px", "100px"],
    },
    duration: 28,
    scrollMultiplier: -0.15,
  },
  {
    color: "bg-accent/20",
    size: "w-[400px] h-[400px]",
    position: "top-[40%] left-[10%]",
    animate: {
      x: ["50px", "-60px", "50px"],
      y: ["0px", "-80px", "0px"],
    },
    duration: 25,
    scrollMultiplier: -0.12,
  },
  {
    color: "bg-primary/10",
    size: "w-[600px] h-[600px]",
    position: "top-[60%] right-[5%]",
    animate: {
      x: ["-40px", "100px", "-40px"],
      y: ["20px", "-60px", "20px"],
    },
    duration: 30,
    scrollMultiplier: -0.2,
  },
  {
    color: "bg-secondary/10",
    size: "w-[450px] h-[450px]",
    position: "top-[80%] left-[20%]",
    animate: {
      x: ["60px", "-80px", "60px"],
      y: ["-30px", "50px", "-30px"],
    },
    duration: 26,
    scrollMultiplier: -0.25,
  },
];

function Orb({
  color,
  size,
  position,
  animate,
  duration,
  scrollMultiplier,
}: (typeof orbData)[number]) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, scrollMultiplier * 1000]);

  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${color} ${size} ${position}`}
      animate={animate}
      style={{ y }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export default function FloatingOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {orbData.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </div>
  );
}
