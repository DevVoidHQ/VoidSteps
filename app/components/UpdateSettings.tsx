import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { setAutoUpdateCheck, useAutoUpdateCheck } from "@/lib/preferences";
import { installUpdate, isDesktop, runUpdateCheck, useUpdaterStatus } from "@/lib/updater";

/**
 * Version, a manual check, and the switch that stops the app talking to the
 * network at all. The banner deliberately stays quiet about a failed or
 * up-to-date check; this is where both get said out loud, because here someone
 * asked.
 */
export default function UpdateSettings() {
  const autoCheck = useAutoUpdateCheck();
  const status = useUpdaterStatus();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  const busy = status.phase === "checking" || status.phase === "installing";

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="type-label">Updates</h2>
          <p className="type-body text-muted-foreground">
            {version ? `You are running VoidSteps ${version}.` : "Running in a browser."} Checking
            for a new release is the only network call the app ever makes. Nothing about you or your
            data is sent.
          </p>
        </div>

        {isDesktop() && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void runUpdateCheck(true)}
            >
              {status.phase === "checking" ? "Checking…" : "Check for updates"}
            </Button>
            {status.phase === "current" && (
              <span className="type-body text-muted-foreground">You are up to date.</span>
            )}
            {status.phase === "available" && (
              <Button size="sm" onClick={() => void installUpdate()}>
                Install {status.update.version} and restart
              </Button>
            )}
            {status.phase === "installing" && (
              <span className="type-body text-muted-foreground">
                Installing {status.version}
                {status.percent === null ? "…" : `… ${status.percent}%`}
              </span>
            )}
            {status.phase === "error" && (
              <span className="type-body text-destructive-ink">{status.message}</span>
            )}
          </div>
        )}

        <Toggle
          size="sm"
          checked={autoCheck}
          onChange={(e) => setAutoUpdateCheck(e.target.checked)}
          label="Check for updates automatically"
          description="Once a day, and when the app starts. Turn this off and VoidSteps makes no network requests at all; you can still check by hand above."
        />
      </CardContent>
    </Card>
  );
}
