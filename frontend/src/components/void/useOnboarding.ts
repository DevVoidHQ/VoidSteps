import { useEffect, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { TUTORIALS } from "./tour-script";
import {
  readOnboarding,
  isAllComplete,
  decideOnboarding,
  startTutorial,
  resetOnboarding,
  ONBOARDING_EVENT,
  type OnboardingProgress,
} from "./onboarding-store";

export interface OnboardingView {
  progress: OnboardingProgress;
  /** true = done, false = needs onboarding, null = still deciding (data loading). */
  complete: boolean | null;
  tutorials: { id: string; title: string; description: string; done: boolean }[];
  hasActive: boolean;
  start: (tutorialId: string) => void;
  reset: () => void;
}

export function useOnboarding(): OnboardingView {
  const { paths, allSteps, routines, reminders, isLoading } = useData();
  const [progress, setProgress] = useState<OnboardingProgress>(readOnboarding);

  useEffect(() => {
    const sync = () => setProgress(readOnboarding());
    window.addEventListener(ONBOARDING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ONBOARDING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const hasData =
    (paths?.length ?? 0) > 0 ||
    (allSteps?.length ?? 0) > 0 ||
    (routines?.length ?? 0) > 0 ||
    (reminders?.length ?? 0) > 0;

  // Decide once: existing accounts (with data) are marked complete, new ones
  // are left to onboard.
  useEffect(() => {
    if (progress.decided || isLoading) return;
    decideOnboarding(hasData);
  }, [progress.decided, isLoading, hasData]);

  const complete: boolean | null = progress.decided
    ? isAllComplete(progress)
    : isLoading
    ? null
    : hasData;

  return {
    progress,
    complete,
    tutorials: TUTORIALS.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      done: progress.completed.includes(t.id),
    })),
    hasActive: !!progress.active,
    start: startTutorial,
    reset: resetOnboarding,
  };
}
