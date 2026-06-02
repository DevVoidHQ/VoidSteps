import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VoidOrb } from "@/components/void/VoidOrb";
import { useOnboarding } from "@/components/void/useOnboarding";
import { Check, ArrowRight, RotateCcw } from "lucide-react";

export default function Onboarding() {
  const { tutorials, complete, start, reset } = useOnboarding();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const doneCount = tutorials.filter((t) => t.done).length;
  const total = tutorials.length;
  const allDone = complete === true;

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    reset();
    setConfirmReset(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-8 md:pt-16">
      <header className="flex items-center gap-4">
        <VoidOrb state={allDone ? "celebrate" : "idle"} size="lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {allDone ? "You're all set" : "Tutorials"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allDone
              ? "You can revisit any tutorial below, or jump into your day."
              : `${doneCount} of ${total} tutorials done. Knock these out to learn the essentials.`}
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-3">
        {tutorials.map((t, i) => (
          <Card key={t.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    t.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.title}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={t.done ? "outline" : "default"}
                onClick={() => start(t.id)}
                className="shrink-0"
              >
                {t.done ? "Replay" : "Start"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {(doneCount > 0 || allDone) && (
        <div className="flex items-center justify-between">
          {doneCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              onBlur={() => setConfirmReset(false)}
              className={confirmReset ? "text-destructive" : "text-muted-foreground"}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {confirmReset ? "Click again to reset" : "Reset progress"}
            </Button>
          ) : (
            <span />
          )}
          {allDone && (
            <Button onClick={() => navigate("/")}>
              Go to Today
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
