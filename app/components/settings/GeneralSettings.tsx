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
  getPostponeDeprioritizes,
  getPrioritizeDefault,
  getShowStepDates,
  getSidebarRail,
  resetGeneralPreferences,
  setDeferDatesMode,
  setDueDatesMode,
  setFontScale,
  setPostponeDeprioritizes,
  setPrioritizeDefault,
  setShowStepDates,
  setSidebarRail,
  type DeferDatesMode,
  type FontScale,
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
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function GeneralSettings() {
  const [deferMode, setDeferMode] = useState<DeferDatesMode>(getDeferDatesMode());
  const [dueMode, setDueMode] = useState<DeferDatesMode>(getDueDatesMode());
  const [prioritizeDefault, setPrioritizeDefaultState] = useState(getPrioritizeDefault());
  const [postponeDeprioritizes, setPostponeDeprioritizesState] = useState(
    getPostponeDeprioritizes()
  );
  const [showStepDates, setShowStepDatesState] = useState(getShowStepDates());
  const [sidebarRail, setSidebarRailState] = useState(getSidebarRail());
  const [fontScale, setFontScaleState] = useState<FontScale>(getFontScale());
  const [zoom, setZoomState] = useState<number>(getZoom());
  const canZoom = zoomSupported();
  const modeOptions = [
    { value: "off", label: "Off (not at all)" },
    { value: "edit", label: "Edit only" },
    { value: "both", label: "Create & edit" },
  ];
  const handleResetGeneral = () => {
    resetGeneralPreferences();
    setDeferMode(getDeferDatesMode());
    setDueMode(getDueDatesMode());
    setPrioritizeDefaultState(getPrioritizeDefault());
    setPostponeDeprioritizesState(getPostponeDeprioritizes());
    setShowStepDatesState(getShowStepDates());
    setSidebarRailState(getSidebarRail());
    setFontScaleState(getFontScale());
    setZoomState(resetZoom());
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="type-section">General</h2>
            <Button variant="outline" size="sm" onClick={handleResetGeneral}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="type-label">Text size</label>
            <p className="type-body text-muted-foreground">
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
                        : "border-transparent bg-field hover:bg-muted"
                    }`}
                  >
                    {/* Rendered at the size it sets, so the control shows what it does. */}
                    {/* type-exempt: previews each text size at its real size */}
                    <span style={{ fontSize: `${FONT_SCALE_PX[scale]}px`, lineHeight: 1.2 }}>
                      Aa
                    </span>
                    <span className="type-meta text-muted-foreground">
                      {FONT_SCALE_LABELS[scale]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <FontSettings />

          {/* Desktop only: in a browser, Cmd +/- is the browser's own zoom. */}
          {canZoom && (
            <div className="space-y-1.5">
              <label className="type-label">Zoom</label>
              <p className="type-body text-muted-foreground">
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
                <span className="min-w-16 text-center type-label tabular-nums">
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
            checked={postponeDeprioritizes}
            onChange={(e) => {
              setPostponeDeprioritizesState(e.target.checked);
              setPostponeDeprioritizes(e.target.checked);
            }}
            label="Postponing a step removes it from today"
            description="Moving a step's due date past today also takes it off today's list. On by default."
          />

          <Toggle
            size="sm"
            checked={sidebarRail}
            onChange={(e) => {
              setSidebarRailState(e.target.checked);
              setSidebarRail(e.target.checked);
            }}
            label="Always keep the icon rail"
            description="Off by default: closing the sidebar with a click leaves the icon rail, closing it with ⌘B hides it completely. On keeps the rail either way."
          />

          <Toggle
            size="sm"
            checked={showStepDates}
            onChange={(e) => {
              setShowStepDatesState(e.target.checked);
              setShowStepDates(e.target.checked);
            }}
            label="Show created & updated dates"
            description="Shows when a step was created and last updated, in its open view. On by default."
          />

          <div className="space-y-1.5">
            <label className="type-label">Due date</label>
            <p className="type-body text-muted-foreground">
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
            <label className="type-label">Defer steps to a later date</label>
            <p className="type-body text-muted-foreground">
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
