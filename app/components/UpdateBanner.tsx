import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  dismissUpdate,
  installUpdate,
  isDesktop,
  runUpdateCheck,
  useUpdaterStatus,
} from "@/lib/updater";

/**
 * The new-version prompt, mounted once in Layout.
 *
 * Deliberately a corner card rather than a dialog: an update is never urgent
 * enough to stand between someone and their task list, and a modal on launch
 * is how an app teaches people to dismiss it without reading. Only "available"
 * and "installing" render at all, so a failed check and an up-to-date check
 * are both silent here. Settings is where you go to be told either of those.
 */
export default function UpdateBanner() {
  const status = useUpdaterStatus();

  useEffect(() => {
    if (!isDesktop()) return;
    // On launch, then daily for a window left open for days. Both go through
    // the same throttle, so this is one request a day, not one per mount.
    void runUpdateCheck();
    const id = setInterval(() => void runUpdateCheck(), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (status.phase !== "available" && status.phase !== "installing") return null;

  const installing = status.phase === "installing";
  const version = installing ? status.version : status.update.version;
  const notes = status.phase === "available" ? status.update.body?.trim() : null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-popover p-4 shadow-elev-3">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="type-label text-foreground">
            {installing ? `Installing ${version}` : `VoidSteps ${version} is available`}
          </p>
          {notes && (
            <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-line type-meta text-muted-foreground">
              {notes}
            </p>
          )}
          {installing ? (
            <p className="mt-2 type-meta text-muted-foreground">
              {status.percent === null ? "Downloading…" : `Downloading… ${status.percent}%`}
              <span className="block">The app restarts when it is done.</span>
            </p>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={() => void installUpdate()}>
                Install and restart
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissUpdate}>
                Later
              </Button>
            </div>
          )}
        </div>
        {!installing && (
          <IconButton
            icon={<X className="h-4 w-4 text-muted-foreground" />}
            aria-label="Dismiss"
            variant="ghost"
            size="icon-sm"
            onClick={dismissUpdate}
          />
        )}
      </div>
    </div>
  );
}
