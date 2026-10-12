import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/cn";
import { setWelcomeDismissed, useWelcomeDismissed } from "@/lib/preferences";
import { STARTER_PATH_TITLE } from "@/lib/starter-path";

/**
 * The first-run welcome, shown inline at the top of Paths.
 *
 * It teaches the three words a new user cannot guess (path, step, prioritized
 * for today) and gets out of the way. Deliberately not a route, a dialog or a
 * wizard: the app renders around it, one click removes it for good, and it
 * keeps no score. Settings can bring it back.
 */
export default function WelcomeCard({ className }: { className?: string }) {
  const dismissed = useWelcomeDismissed();
  const navigate = useNavigate();
  const { activePaths } = useData();

  if (dismissed) return null;

  const hasStarter = activePaths?.some((p) => p.title === STARTER_PATH_TITLE) ?? false;
  const dismiss = () => setWelcomeDismissed(true);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Welcome to VoidSteps</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Path</span>: something you are working
              toward.
            </li>
            <li>
              <span className="font-medium text-foreground">Step</span>: one concrete thing to do,
              under a path or on its own.
            </li>
            <li>
              <span className="font-medium text-foreground">Prioritized for today</span>: your short
              list on Today.
            </li>
          </ul>
          {hasStarter && (
            <p className="mt-2 text-sm text-muted-foreground">
              Try the three steps in Getting Started, then delete it.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={() => navigate("/steps")}>
              Open steps
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Got it
            </Button>
          </div>
        </div>
        <IconButton
          icon={<X className="h-4 w-4 text-muted-foreground" />}
          aria-label="Dismiss"
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
        />
      </div>
    </div>
  );
}
