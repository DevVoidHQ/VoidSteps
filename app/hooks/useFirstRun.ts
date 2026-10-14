import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { reportError } from "@/lib/error-store";
import { getWelcomeDismissed } from "@/lib/preferences";
import { seedStarterPath } from "@/lib/starter-path";

/**
 * First launch: seed the starter path into an empty profile and, if that
 * happened while still on the default route, land on Paths instead of an empty
 * Calendar. Runs in the background; nothing waits on it, so the app renders
 * exactly as it would otherwise.
 */
export function useFirstRun() {
  const navigate = useNavigate();
  const location = useLocation();
  // Read after the seed resolves, not from the effect's closure, so someone
  // who navigates away during the seed is not pulled back to Paths.
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (getWelcomeDismissed()) return;
    seedStarterPath()
      .then((seeded) => {
        if (seeded && pathnameRef.current === "/") navigate("/paths", { replace: true });
      })
      .catch((e) => {
        void reportError("mutation", e, { phase: "starterPath" });
      });
    // Once per launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
