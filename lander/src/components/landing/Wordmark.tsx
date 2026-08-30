import { cn } from "@/lib/cn";

/**
 * Brand wordmarks: single source of truth for color rules.
 *   VoidSteps → "Void" primary (blue) + "Steps" accent (rose)
 *   DevVoid   → "Dev" primary (blue) + "Void" accent (rose)
 * Reuse these everywhere the names appear as a logo/lockup.
 */

export function VoidStepsMark({
  className,
  withDot = false,
}: {
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span className={cn("font-bold tracking-tight", className)}>
      <span className="text-primary">Void</span>
      <span className="text-accent">Steps</span>
      {withDot && <span className="text-accent">.</span>}
    </span>
  );
}

export function DevVoidMark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold", className)}>
      <span className="text-primary">Dev</span>
      <span className="text-accent">Void</span>
    </span>
  );
}

/** "a DevVoid product" sub-lockup used under the product wordmark. */
export function DevVoidProduct({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] font-medium text-foreground/55", className)}>
      a <DevVoidMark /> product
    </span>
  );
}
