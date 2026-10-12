import FontSettings from "./FontSettings";
import DayRoutineSettings from "./DayRoutineSettings";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import {
  FONT_SCALE_LABELS,
  FONT_SCALE_ORDER,
  FONT_SCALE_PX,
  getDeferDatesMode,
  getDueDatesMode,
  getFontScale,
  getPrioritizeDefault,
  getShowStepDates,
  getStepActions,
  getStepsClickAction,
  getTodayClickAction,
  resetGeneralPreferences,
  setDeferDatesMode,
  setDueDatesMode,
  setFontScale,
  setPrioritizeDefault,
  setShowStepDates,
  setStepActionMode,
  setStepsClickAction,
  setTodayClickAction,
  setWelcomeDismissed,
  STEP_ACTION_LABELS,
  STEP_ACTION_ORDER,
  type DeferDatesMode,
  type FontScale,
  type StepActionsConfig,
  type StepClickAction,
} from "@/lib/preferences";
import {
  DEFAULT_ZOOM,
  formatZoom,
  getZoom,
  resetZoom,
  setZoom,
  stepZoom,
  ZOOM_LEVELS,
  zoomSupported,
} from "@/lib/zoom";
import { reportError } from "@/lib/error-store";
import { seedStarterPath } from "@/lib/starter-path";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function GeneralSettings() {
  const navigate = useNavigate();
  const [deferMode, setDeferMode] = useState<DeferDatesMode>(getDeferDatesMode());
  const [dueMode, setDueMode] = useState<DeferDatesMode>(getDueDatesMode());
  const [prioritizeDefault, setPrioritizeDefaultState] = useState(getPrioritizeDefault());
  const [showStepDates, setShowStepDatesState] = useState(getShowStepDates());
  const [fontScale, setFontScaleState] = useState<FontScale>(getFontScale());
  const [zoom, setZoomState] = useState<number>(getZoom());
  const canZoom = zoomSupported();
  const [stepActions, setStepActions] = useState<StepActionsConfig>(getStepActions());
  const [stepsClick, setStepsClick] = useState<StepClickAction>(getStepsClickAction());
  const [todayClick, setTodayClick] = useState<StepClickAction>(getTodayClickAction());
  const modeOptions = [
    { value: "off", label: "Off (not at all)" },
    { value: "edit", label: "Edit only" },
    { value: "both", label: "Create & edit" },
  ];
  const clickOptions = [
    { value: "prioritize", label: "Prioritize / deprioritize" },
    { value: "play", label: "Start / stop timer" },
    { value: "complete", label: "Mark complete" },
    { value: "open", label: "Open activity" },
    { value: "none", label: "Do nothing" },
  ];
  const handleResetGeneral = () => {
    resetGeneralPreferences();
    setDeferMode(getDeferDatesMode());
    setDueMode(getDueDatesMode());
    setPrioritizeDefaultState(getPrioritizeDefault());
    setShowStepDatesState(getShowStepDates());
    setFontScaleState(getFontScale());
    setZoomState(resetZoom());
    setStepActions(getStepActions());
    setStepsClick(getStepsClickAction());
    setTodayClick(getTodayClickAction());
  };
  const handleShowWelcome = () => {
    setWelcomeDismissed(false);
    // Only seeds a profile with no paths and no steps, so this never adds
    // sample data on top of real work.
    seedStarterPath().catch((e) => {
      void reportError("mutation", e, { phase: "starterPath" });
    });
    navigate("/paths");
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">General</h2>
            <Button variant="outline" size="sm" onClick={handleResetGeneral}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Text size</label>
            <p className="text-sm text-muted-foreground">
              The base type size, which scales layout with it so nothing gets cramped. Independent
              of zoom. Applies immediately.
            </p>
            <div className="flex flex-wrap items-end gap-2 pt-1">
              {FONT_SCALE_ORDER.map((scale) => {
                const active = scale === fontScale;
                return (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => {
                      setFontScaleState(scale);
                      setFontScale(scale);
                    }}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 px-4 py-2 transition-colors ${
                      active
                        ? "border-primary bg-primary-light/50"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {/* Rendered at the size it sets, so the control shows what it does. */}
                    <span style={{ fontSize: `${FONT_SCALE_PX[scale]}px`, lineHeight: 1.2 }}>
                      Aa
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {FONT_SCALE_LABELS[scale]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Welcome guide</label>
            <p className="text-sm text-muted-foreground">
              Shows the short guide to paths and steps on the Paths page again. An empty profile
              also gets the Getting Started path back.
            </p>
            <div className="pt-1">
              <Button variant="outline" size="sm" onClick={handleShowWelcome}>
                Show again
              </Button>
            </div>
          </div>

          <FontSettings />

          {/* Desktop only: in a browser, Cmd +/- is the browser's own zoom. */}
          {canZoom && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Zoom</label>
              <p className="text-sm text-muted-foreground">
                Scales the entire app the way browser zoom does, notes and path canvas included. Use
                ⌘ + and ⌘ - to change it, ⌘ 0 to reset, or hold ⌘ while scrolling.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Zoom out"
                  disabled={zoom <= ZOOM_LEVELS[0]}
                  onClick={() => setZoomState(stepZoom(-1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="min-w-16 text-center text-sm tabular-nums font-medium">
                  {formatZoom(zoom)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Zoom in"
                  disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  onClick={() => setZoomState(stepZoom(1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={zoom === DEFAULT_ZOOM}
                  onClick={() => setZoomState(setZoom(DEFAULT_ZOOM))}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}

          <Toggle
            size="sm"
            checked={prioritizeDefault}
            onChange={(e) => {
              setPrioritizeDefaultState(e.target.checked);
              setPrioritizeDefault(e.target.checked);
            }}
            label="Prioritize new steps for today by default"
            description="Pre-checks 'Prioritize for today' when creating a step. Off by default."
          />

          <Toggle
            size="sm"
            checked={showStepDates}
            onChange={(e) => {
              setShowStepDatesState(e.target.checked);
              setShowStepDates(e.target.checked);
            }}
            label="Show created & updated dates on steps"
            description="Adds a small footer to each step with when it was created and last updated. On by default."
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clicking a step on the Steps page</label>
            <p className="text-sm text-muted-foreground">
              What happens when you click a step's title or body on the Steps page.
            </p>
            <Select
              className="max-w-xs"
              value={stepsClick}
              onValueChange={(v) => {
                const a = v as StepClickAction;
                setStepsClick(a);
                setStepsClickAction(a);
              }}
              options={clickOptions}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clicking a step on Today</label>
            <p className="text-sm text-muted-foreground">
              What happens when you click a step's title or body on the Today page.
            </p>
            <Select
              className="max-w-xs"
              value={todayClick}
              onValueChange={(v) => {
                const a = v as StepClickAction;
                setTodayClick(a);
                setTodayClickAction(a);
              }}
              options={clickOptions}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Step actions</label>
              <p className="text-sm text-muted-foreground">
                Each action shows as its own inline button when on, or moves into the step's "more"
                menu when off.
              </p>
            </div>
            {STEP_ACTION_ORDER.map((key) => (
              <Toggle
                key={key}
                size="sm"
                checked={stepActions[key] === "open"}
                onChange={(e) => {
                  const mode = e.target.checked ? "open" : "compact";
                  setStepActions((prev) => ({ ...prev, [key]: mode }));
                  setStepActionMode(key, mode);
                }}
                label={STEP_ACTION_LABELS[key]}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Due date</label>
            <p className="text-sm text-muted-foreground">
              A deadline for the step. Choose where it can be set.
            </p>
            <Select
              className="max-w-xs"
              value={dueMode}
              onValueChange={(v) => {
                const m = v as DeferDatesMode;
                setDueMode(m);
                setDueDatesMode(m);
              }}
              options={modeOptions}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Defer steps to a later date</label>
            <p className="text-sm text-muted-foreground">
              A "Defer until" date hides a step until that day. Choose where it can be set.
            </p>
            <Select
              className="max-w-xs"
              value={deferMode}
              onValueChange={(v) => {
                const m = v as DeferDatesMode;
                setDeferMode(m);
                setDeferDatesMode(m);
              }}
              options={modeOptions}
            />
          </div>
        </CardContent>
      </Card>

      <DayRoutineSettings />
    </div>
  );
}

// Options as minutes-past-midnight in 30-min steps, inclusive.
