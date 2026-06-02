import { useEffect, useLayoutEffect, useState } from "react";
import { VoidOrb, type VoidState } from "./VoidOrb";

/** Track a target element's viewport rect, updating on scroll/resize/layout. */
function useTargetRect(selector: string | null, active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        // Only update on meaningful change to avoid render churn.
        setRect((prev) =>
          prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
            ? prev
            : r
        );
      } else {
        setRect(null);
      }
    };
    // Scroll the target into view once, then track it.
    const el = document.querySelector(selector) as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });

    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selector, active]);

  return rect;
}

export interface CoachmarkProps {
  /** CSS selector for the anchor element (e.g. `[data-tour="new-step"]`). */
  target: string;
  title: string;
  body: string;
  orbState?: VoidState;
  stepIndex: number;
  stepCount: number;
  /** Shown when the step isn't auto-gated; advances on click. */
  ctaLabel?: string;
  onCta?: () => void;
  onSkip: () => void;
}

const PAD = 8;

export function VoidCoachmark({
  target,
  title,
  body,
  orbState = "talking",
  stepIndex,
  stepCount,
  ctaLabel,
  onCta,
  onSkip,
}: CoachmarkProps) {
  const rect = useTargetRect(target, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Bubble placement: below the target if there's room, else above.
  const bubbleWidth = 340;
  const placeBelow = !rect || vh - rect.bottom > 220;
  const left = rect ? Math.min(Math.max(rect.left, 12), vw - bubbleWidth - 12) : vw / 2 - bubbleWidth / 2;

  const dim = "hsl(var(--foreground) / 0.45)";

  return (
    // Wrapper is click-through; only the dim panels and bubble capture events,
    // so the highlighted target stays clickable through the hole.
    <div className="fixed inset-0 z-[45]" style={{ pointerEvents: "none" }} role="dialog" aria-modal="true" aria-label="Onboarding">
      {rect ? (
        <>
          {/* Four dim panels around the target leave a clickable hole. */}
          <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: Math.max(rect.top - PAD, 0), background: dim, pointerEvents: "auto" }} onClick={onSkip} />
          <div style={{ position: "fixed", top: rect.bottom + PAD, left: 0, width: "100vw", height: Math.max(vh - rect.bottom - PAD, 0), background: dim, pointerEvents: "auto" }} onClick={onSkip} />
          <div style={{ position: "fixed", top: rect.top - PAD, left: 0, width: Math.max(rect.left - PAD, 0), height: rect.height + PAD * 2, background: dim, pointerEvents: "auto" }} onClick={onSkip} />
          <div style={{ position: "fixed", top: rect.top - PAD, left: rect.right + PAD, width: Math.max(vw - rect.right - PAD, 0), height: rect.height + PAD * 2, background: dim, pointerEvents: "auto" }} onClick={onSkip} />
          {/* Highlight ring around the hole (non-blocking). */}
          <div
            style={{
              position: "fixed",
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              borderRadius: 12,
              boxShadow: "0 0 0 2px hsl(var(--primary) / 0.7)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        // Target not found yet (e.g. mid-navigation): plain dim.
        <div style={{ position: "fixed", inset: 0, background: dim, pointerEvents: "auto" }} onClick={onSkip} />
      )}

      {/* Speech bubble */}
      <div
        className="fixed border border-input bg-background shadow-xl p-4 overflow-hidden"
        style={
          placeBelow
            ? { top: (rect ? rect.bottom + PAD : vh / 2) + 12, left, width: bubbleWidth, pointerEvents: "auto", borderRadius: 16 }
            : { bottom: vh - (rect ? rect.top - PAD : vh / 2) + 12, left, width: bubbleWidth, pointerEvents: "auto", borderRadius: 16 }
        }
      >
        <div className="flex items-start gap-3">
          <VoidOrb state={orbState} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{title}</div>
            <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {stepIndex + 1} / {stepCount}
              </span>
              <div className="flex items-center gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onSkip}>
                  Skip
                </button>
                {ctaLabel ? (
                  <button
                    className="text-xs font-medium rounded-md bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90"
                    onClick={onCta}
                  >
                    {ctaLabel}
                  </button>
                ) : (
                  <span className="text-xs text-primary font-medium">Try it →</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
