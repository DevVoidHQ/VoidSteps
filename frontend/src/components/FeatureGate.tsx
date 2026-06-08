import { Lock } from 'lucide-react';
import { useCan, type Feature } from '@/lib/use-plan';

const COPY: Record<string, { title: string; body: string }> = {
  notes: {
    title: 'Notes are a Pro feature',
    body: 'Capture markdown notes and notebooks alongside your steps, synced across every device.',
  },
  analytics: {
    title: 'Analytics are a Pro feature',
    body: 'See your completion history, streaks, and time-spent trends across all your paths.',
  },
};

/**
 * Client-side feature wall. UX only -- writes are re-checked server-side. Shown
 * when the current plan lacks `feature`; otherwise renders children untouched.
 */
export default function FeatureGate({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const allowed = useCan(feature);
  if (allowed) return <>{children}</>;

  const copy = COPY[feature] ?? { title: 'Pro feature', body: 'Upgrade to unlock this.' };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
        <Lock className="h-6 w-6 text-primary" />
      </span>
      <h2 className="text-2xl font-bold">{copy.title}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{copy.body}</p>
      <a
        href="https://voidsteps.com/#pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Upgrade to Pro
      </a>
    </div>
  );
}
