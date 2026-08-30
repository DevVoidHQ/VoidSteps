/**
 * The organic colour fields the whole page sits on. Hand-authored paths so
 * they read as drawn shapes rather than CSS blur, which is what separates
 * this look from a generic gradient background.
 */
const SHAPES = {
  a: "M0,320 C180,180 340,420 520,300 C700,180 840,360 1000,250 L1000,1000 L0,1000 Z",
  b: "M0,520 C160,380 300,600 480,470 C660,340 820,540 1000,400 L1000,1000 L0,1000 Z",
  c: "M60,120 C240,40 420,220 600,140 C780,60 900,240 1000,160 L1000,1000 L0,1000 Z",
};

interface BlobProps {
  shape?: keyof typeof SHAPES;
  className?: string;
  /** Any Tailwind fill utility, e.g. "fill-accent". */
  fill?: string;
}

export default function Blob({ shape = "a", className, fill = "fill-accent" }: BlobProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    >
      <path d={SHAPES[shape]} className={fill} />
    </svg>
  );
}
