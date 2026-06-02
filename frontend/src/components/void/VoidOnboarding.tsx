import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { VoidOrb, type VoidState } from "./VoidOrb";
import { VoidCoachmark } from "./VoidCoachmark";
import { getTutorial, type GateData } from "./tour-script";
import { useOnboarding } from "./useOnboarding";
import { setActiveStep, completeTutorial, stopTutorial } from "./onboarding-store";

/**
 * Runs whichever tutorial is currently active in the onboarding store (started
 * from the Onboarding page). Mounted once above the routed pages so it survives
 * navigation. Advances as the user performs each real action.
 */
export function VoidOnboarding() {
  const { progress } = useOnboarding();
  const { paths, allSteps } = useData();
  const location = useLocation();

  const active = progress.active;
  const tutorial = active ? getTutorial(active.tutorialId) : null;
  const step = active && tutorial ? tutorial.steps[active.step] : null;

  const gate: GateData = useMemo(
    () => ({
      paths: paths?.length ?? 0,
      nested: paths?.filter((p) => p.parentId).length ?? 0,
      steps: allSteps?.length ?? 0,
      stepsWithPath: allSteps?.filter((s) => s.pathId).length ?? 0,
      prioritized: allSteps?.filter((s) => s.prioritizedToday).length ?? 0,
      completed: allSteps?.filter((s) => s.completed).length ?? 0,
    }),
    [paths, allSteps]
  );

  const gateRef = useRef(gate);
  gateRef.current = gate;
  const baselineRef = useRef<GateData | null>(null);

  const advance = useCallback(() => {
    if (!active || !tutorial) return;
    const next = active.step + 1;
    if (next >= tutorial.steps.length) completeTutorial(active.tutorialId);
    else setActiveStep(next);
  }, [active, tutorial]);

  // Snapshot a baseline when entering a step (delta gating works on replay).
  useEffect(() => {
    if (active) baselineRef.current = gateRef.current;
  }, [active?.tutorialId, active?.step, active]);

  // Auto-advance: reaching the target route, or a fresh data action.
  useEffect(() => {
    if (!active || !step) return;
    if (step.reachRoute) {
      if (location.pathname === step.reachRoute) advance();
      return;
    }
    if (step.gate && baselineRef.current && step.gate(gate, baselineRef.current)) advance();
  }, [active, step, gate, advance, location.pathname]);

  if (!active || !tutorial || !step) return null;

  const isLast = active.step === tutorial.steps.length - 1;

  if (step.kind === "hero") {
    return (
      <Hero
        orbState={step.orbState}
        title={step.title}
        body={step.body}
        primary={{ label: step.cta ?? "Next", onClick: advance }}
        secondary={isLast ? undefined : { label: "Skip", onClick: stopTutorial }}
      />
    );
  }

  if (step.kind === "key") {
    return (
      <KeyPrompt
        orbState={step.orbState}
        keycap={step.keycap ?? ""}
        title={step.title}
        body={step.body}
        stepIndex={active.step}
        stepCount={tutorial.steps.length}
        onSkip={stopTutorial}
      />
    );
  }

  // coachmark
  if (step.target) {
    return (
      <VoidCoachmark
        target={step.target}
        title={step.title}
        body={step.body}
        orbState={step.orbState}
        stepIndex={active.step}
        stepCount={tutorial.steps.length}
        ctaLabel={step.cta}
        onCta={step.cta ? advance : undefined}
        onSkip={stopTutorial}
      />
    );
  }

  return null;
}

interface HeroBtn {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Hero({
  orbState,
  title,
  body,
  primary,
  secondary,
}: {
  orbState: VoidState;
  title: string;
  body: string;
  primary: HeroBtn;
  secondary?: HeroBtn;
}) {
  return (
    <div className="fixed inset-0 z-[46] flex items-center justify-center p-4" style={{ background: "hsl(var(--foreground) / 0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-input bg-background shadow-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <VoidOrb state={orbState} size="lg" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5">{body}</p>
        <div className="flex flex-col gap-2 mt-5">
          <button
            className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:bg-primary/90 disabled:opacity-60"
            onClick={primary.onClick}
            disabled={primary.disabled}
          >
            {primary.label}
          </button>
          {secondary && (
            <button className="w-full text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Docked card (bottom-right, non-blocking) teaching a keyboard shortcut. */
function KeyPrompt({
  orbState,
  keycap,
  title,
  body,
  stepIndex,
  stepCount,
  onSkip,
}: {
  orbState: VoidState;
  keycap: string;
  title: string;
  body: string;
  stepIndex: number;
  stepCount: number;
  onSkip: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[44] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-input bg-background shadow-2xl p-4">
      <div className="flex items-start gap-3">
        <VoidOrb state={orbState} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {keycap && (
              <kbd className="ml-auto inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-input bg-muted px-2 font-mono text-sm font-semibold shadow-sm">
                {keycap}
              </kbd>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{body}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {stepIndex + 1} / {stepCount}
            </span>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onSkip}>
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
