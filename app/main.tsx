import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import { applyFontScale } from "./lib/preferences";
import { applyZoom } from "./lib/zoom";
import { applyUserFont } from "./lib/user-font";
import "./index.css";

// Before first paint, or the app renders at the default size and visibly
// jumps once React mounts.
applyFontScale();
applyZoom();
// Async because it reads the font blob out of Dexie. It cannot block first
// paint, so the stylesheet default (Geist) renders until it resolves.
void applyUserFont();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
