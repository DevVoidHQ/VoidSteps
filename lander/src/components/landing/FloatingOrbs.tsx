import { motion, useScroll, useTransform } from "framer-motion";

/*
  3 parallax depth layers, each with 2-3 blobs.
  - Layer 1 (far):   large, very blurred, slow scroll (0.05x)
  - Layer 2 (mid):   medium, moderate blur, medium scroll (0.15x)
  - Layer 3 (near):  smaller, lighter blur, fast scroll (0.3x)

  Single useScroll → 3 useTransform calls → minimal overhead.
  Each blob also has its own CSS keyframe drift for ambient movement.
*/

interface BlobDef {
  width: number;
  height: number;
  top: string;
  left?: string;
  right?: string;
  color: string;
  blur: string;
  borderRadius: string;
  drift: string;
  driftDuration: number;
}

const farLayer: BlobDef[] = [
  {
    width: 600, height: 550,
    top: "2%", left: "-8%",
    color: "hsl(var(--primary) / 0.07)",
    blur: "blur-[80px]",
    borderRadius: "62% 38% 46% 54% / 52% 60% 40% 48%",
    drift: "orb-drift-1", driftDuration: 30,
  },
  {
    width: 700, height: 650,
    top: "45%", right: "-12%",
    color: "hsl(var(--accent-warm) / 0.05)",
    blur: "blur-[90px]",
    borderRadius: "44% 56% 58% 42% / 48% 38% 62% 52%",
    drift: "orb-drift-2", driftDuration: 35,
  },
  {
    width: 500, height: 480,
    top: "75%", left: "30%",
    color: "hsl(var(--accent-green) / 0.04)",
    blur: "blur-[70px]",
    borderRadius: "55% 45% 40% 60% / 60% 50% 50% 40%",
    drift: "orb-drift-3", driftDuration: 28,
  },
];

const midLayer: BlobDef[] = [
  {
    width: 380, height: 350,
    top: "10%", right: "5%",
    color: "hsl(var(--primary) / 0.08)",
    blur: "blur-[50px]",
    borderRadius: "50% 50% 38% 62% / 60% 44% 56% 40%",
    drift: "orb-drift-4", driftDuration: 22,
  },
  {
    width: 420, height: 400,
    top: "50%", left: "-3%",
    color: "hsl(var(--accent-warm) / 0.06)",
    blur: "blur-[55px]",
    borderRadius: "40% 60% 52% 48% / 55% 45% 55% 45%",
    drift: "orb-drift-5", driftDuration: 26,
  },
  {
    width: 300, height: 280,
    top: "80%", right: "20%",
    color: "hsl(var(--accent-green) / 0.06)",
    blur: "blur-[45px]",
    borderRadius: "58% 42% 48% 52% / 42% 58% 42% 58%",
    drift: "orb-drift-6", driftDuration: 20,
  },
];

const nearLayer: BlobDef[] = [
  {
    width: 220, height: 200,
    top: "15%", left: "15%",
    color: "hsl(var(--primary) / 0.06)",
    blur: "blur-[30px]",
    borderRadius: "46% 54% 60% 40% / 50% 42% 58% 50%",
    drift: "orb-drift-7", driftDuration: 18,
  },
  {
    width: 260, height: 240,
    top: "60%", right: "8%",
    color: "hsl(var(--accent-amber) / 0.05)",
    blur: "blur-[35px]",
    borderRadius: "52% 48% 44% 56% / 56% 52% 48% 44%",
    drift: "orb-drift-8", driftDuration: 16,
  },
];

function BlobLayer({
  blobs,
  y,
}: {
  blobs: BlobDef[];
  y: ReturnType<typeof useTransform>;
}) {
  return (
    <motion.div
      className="absolute inset-0 will-change-transform"
      style={{ y }}
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          className={`absolute ${blob.blur} will-change-transform`}
          style={{
            width: blob.width,
            height: blob.height,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            backgroundColor: blob.color,
            borderRadius: blob.borderRadius,
            animation: `${blob.drift} ${blob.driftDuration}s ease-in-out infinite`,
          }}
        />
      ))}
    </motion.div>
  );
}

export default function FloatingOrbs() {
  const { scrollYProgress } = useScroll();

  // Parallax: far moves least, near moves most (negative = moves up as user scrolls down)
  const farY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const nearY = useTransform(scrollYProgress, [0, 1], [0, -400]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <BlobLayer blobs={farLayer} y={farY} />
      <BlobLayer blobs={midLayer} y={midY} />
      <BlobLayer blobs={nearLayer} y={nearY} />
    </div>
  );
}
