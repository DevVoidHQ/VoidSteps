import "./void.css";

export type VoidState = "idle" | "talking" | "thinking" | "celebrate";
export type VoidSize = "sm" | "md" | "lg" | number;

const SIZE_PX: Record<Exclude<VoidSize, number>, number> = {
  sm: 28,
  md: 56,
  lg: 104,
};

interface VoidOrbProps {
  state?: VoidState;
  size?: VoidSize;
  glow?: boolean;
  className?: string;
}

/**
 * Void: the DevVoid ambassador. An abstract gradient orb with a few
 * expressive states. Self-contained (no app imports) so it lifts cleanly
 * into a shared brand package later.
 */
export function VoidOrb({ state = "idle", size = "md", glow = true, className = "" }: VoidOrbProps) {
  const px = typeof size === "number" ? size : SIZE_PX[size];
  return (
    <span
      className={`void-orb-wrap ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {glow && <span className="void-orb-glow" />}
      {/* keyed by state so celebrate re-triggers its one-shot animation */}
      <span key={state} className={`void-orb void-orb--${state}`} />
      {state === "celebrate" && (
        <>
          <span className="void-spark s1" />
          <span className="void-spark s2" />
          <span className="void-spark s3" />
          <span className="void-spark s4" />
        </>
      )}
    </span>
  );
}
