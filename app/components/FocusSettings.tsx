import { useEffect, useRef, useState } from "react";
import { Image, Music, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { FOCUS_BACKGROUNDS, FOCUS_IMAGE_SCRIM, focusBackgroundCss } from "@/lib/focus-background";
import { clearFocusMedia, setFocusMedia, useFocusMedia } from "@/lib/focus-media";
import {
  BUNDLED_TRACKS,
  CUSTOM_TRACK_ID,
  TRACK_ARTIST,
  TRACK_SOURCE_URL,
  findBundledTrack,
} from "@/lib/focus-tracks";
import {
  setFocusBackground,
  setFocusTrack,
  setOpenFocusOnPlay,
  setTimerBarHidden,
  useTimerBarHidden,
  useFocusBackground,
  useFocusTrack,
  useOpenFocusOnPlay,
} from "@/lib/preferences";
import { openExternal } from "@/lib/platform";
import { useToast } from "@/contexts/ToastContext";

const CUSTOM_BACKGROUND_ID = "custom";

/**
 * The Focus tab.
 *
 * Focus mode is the one surface whose whole job is how it looks and sounds, so
 * it gets a preview rather than a swatch grid: a preset composed from theme
 * variables looks different under every theme, and a track is a track. You
 * should not have to start a timer to find out what you picked.
 */
export default function FocusSettings() {
  const toast = useToast();
  const backgroundId = useFocusBackground();
  const trackId = useFocusTrack();
  const { url: wallpaperUrl, name: wallpaperName } = useFocusMedia("wallpaper");
  const { url: customAudioUrl, name: audioName } = useFocusMedia("audio");
  // Reactive, so resetting preferences elsewhere updates this toggle too.
  const openOnPlay = useOpenFocusOnPlay();
  const timerBarHidden = useTimerBarHidden();

  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  // Audition is entirely separate from focus mode's own playback: it never
  // touches the audio-on preference and it stops when you leave the tab, so
  // previewing here can't leave sound running later.
  const [auditioning, setAuditioning] = useState<string | null>(null);
  const auditionRef = useRef<HTMLAudioElement | null>(null);

  const stopAudition = () => {
    auditionRef.current?.pause();
    auditionRef.current = null;
    setAuditioning(null);
  };
  useEffect(() => stopAudition, []);

  const audition = (id: string, src: string | null) => {
    if (!src) return;
    if (auditioning === id) return stopAudition();
    stopAudition();
    const el = new Audio(src);
    el.loop = true;
    el.volume = 0.6;
    el.play().catch(() => {});
    auditionRef.current = el;
    setAuditioning(id);
  };

  const pick = async (kind: "wallpaper" | "audio", file: File | undefined) => {
    if (!file) return;
    try {
      await setFocusMedia(kind, file);
      if (kind === "wallpaper") setFocusBackground(CUSTOM_BACKGROUND_ID);
      if (kind === "audio") setFocusTrack(CUSTOM_TRACK_ID);
      toast.success(kind === "wallpaper" ? "Wallpaper set" : "Track set");
    } catch {
      toast.error("Could not read that file");
    }
  };

  const clear = async (kind: "wallpaper" | "audio") => {
    await clearFocusMedia(kind);
    if (kind === "wallpaper" && backgroundId === CUSTOM_BACKGROUND_ID) {
      setFocusBackground(FOCUS_BACKGROUNDS[0].id);
    }
    if (kind === "audio") {
      if (auditioning === CUSTOM_TRACK_ID) stopAudition();
      if (trackId === CUSTOM_TRACK_ID) setFocusTrack(BUNDLED_TRACKS[0].id);
    }
  };

  const usingImage = backgroundId === CUSTOM_BACKGROUND_ID && wallpaperUrl;
  const previewBackground = usingImage
    ? `${FOCUS_IMAGE_SCRIM}, url("${wallpaperUrl}")`
    : focusBackgroundCss(backgroundId);

  const selectedTrack =
    trackId === CUSTOM_TRACK_ID ? audioName : (findBundledTrack(trackId)?.title ?? null);

  const swatch = (selected: boolean) =>
    `h-12 rounded-lg text-xs font-medium transition ${
      selected ? "ring-2 ring-primary" : "ring-1 ring-border/40 hover:ring-border"
    }`;

  return (
    <div className="space-y-8">
      {/* Preview. The reason this tab exists. */}
      <div>
        <div
          className="flex h-56 flex-col items-center justify-center rounded-xl bg-background bg-cover bg-center ring-1 ring-border/40"
          style={{ backgroundImage: previewBackground }}
        >
          <div className="text-xs text-muted-foreground">
            <span className="font-mono text-foreground">9:41</span>
            <span className="mx-2">·</span>
            <span>Wednesday, September 2</span>
            {selectedTrack && (
              <>
                <span className="mx-2">·</span>
                <span>{selectedTrack}</span>
              </>
            )}
          </div>
          <div className="mt-5 rounded-full px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-border/50">
            Launch
          </div>
          <p className="mt-3 text-lg font-semibold text-foreground">
            Write the launch announcement
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-primary">24:13</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A preview of the fullscreen focus view. Presets are drawn from your current theme, so they
          follow it when you switch.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Background</label>
        <div className="grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-5">
          {FOCUS_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              aria-pressed={backgroundId === bg.id}
              onClick={() => setFocusBackground(bg.id)}
              className={swatch(backgroundId === bg.id)}
              style={{ backgroundImage: focusBackgroundCss(bg.id) }}
            >
              {bg.label}
            </button>
          ))}
          {wallpaperUrl && (
            <button
              type="button"
              aria-pressed={backgroundId === CUSTOM_BACKGROUND_ID}
              onClick={() => setFocusBackground(CUSTOM_BACKGROUND_ID)}
              className={`${swatch(backgroundId === CUSTOM_BACKGROUND_ID)} bg-cover bg-center`}
              style={{ backgroundImage: `url("${wallpaperUrl}")` }}
            >
              <span className="rounded bg-background/70 px-1 py-0.5">Yours</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pick("wallpaper", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => imageInput.current?.click()}>
            <Image className="mr-2 h-4 w-4" />
            {wallpaperName ? "Replace image" : "Use your own image"}
          </Button>
          {wallpaperName && (
            <>
              <span className="max-w-[16rem] truncate text-sm text-muted-foreground">
                {wallpaperName}
              </span>
              <Button variant="ghost" size="sm" onClick={() => clear("wallpaper")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sound</label>
        <p className="text-sm text-muted-foreground">
          Looped while focus mode is open. Volume and mute live in the focus view. The tracks ship
          with the app, so nothing streams and nothing is fetched.
        </p>

        <ul className="max-w-2xl divide-y divide-border/50 pt-1">
          {BUNDLED_TRACKS.map((t) => (
            <TrackRow
              key={t.id}
              title={t.title}
              subtitle={TRACK_ARTIST}
              subtitleHref={TRACK_SOURCE_URL}
              selected={trackId === t.id}
              playing={auditioning === t.id}
              onSelect={() => setFocusTrack(t.id)}
              onAudition={() => audition(t.id, t.src)}
            />
          ))}
          {audioName && (
            <TrackRow
              title={audioName}
              subtitle="Your file"
              selected={trackId === CUSTOM_TRACK_ID}
              playing={auditioning === CUSTOM_TRACK_ID}
              onSelect={() => setFocusTrack(CUSTOM_TRACK_ID)}
              onAudition={() => audition(CUSTOM_TRACK_ID, customAudioUrl)}
              onRemove={() => clear("audio")}
            />
          )}
        </ul>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={audioInput}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              pick("audio", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => audioInput.current?.click()}>
            <Music className="mr-2 h-4 w-4" />
            {audioName ? "Replace your track" : "Use your own track"}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        <Toggle
          size="sm"
          checked={openOnPlay}
          onChange={(e) => setOpenFocusOnPlay(e.target.checked)}
          label="Open focus view when starting a timer"
          description="Starting a step's timer opens the fullscreen focus view. On by default."
        />
        <Toggle
          size="sm"
          checked={!timerBarHidden}
          onChange={(e) => setTimerBarHidden(!e.target.checked)}
          label="Show the running timer bar"
          description="The floating bar with the live clock. Turning it off hides the bar and the focus view, and does not stop anything: timers keep running and still show on their step cards."
        />
        <p className="text-sm text-muted-foreground">
          Your own image and track are not included in backups, because they would add tens of
          megabytes to every export. On a new machine, pick them again.
        </p>
      </div>
    </div>
  );
}

function TrackRow({
  title,
  subtitle,
  selected,
  playing,
  onSelect,
  onAudition,
  onRemove,
  subtitleHref,
}: {
  title: string;
  subtitle: string;
  /** Makes the subtitle a link, used to credit the artist once per row. */
  subtitleHref?: string;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onAudition: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <button
        type="button"
        aria-label={playing ? `Stop ${title}` : `Preview ${title}`}
        onClick={onAudition}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="min-w-0 flex-1 rounded-md px-2 py-1 text-left transition hover:bg-muted"
      >
        <span
          className={`block truncate text-sm ${selected ? "text-foreground" : "text-muted-foreground"}`}
        >
          {title}
        </span>
      </button>

      {subtitleHref ? (
        <button
          type="button"
          onClick={() => openExternal(subtitleHref)}
          className="shrink-0 text-xs text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
        >
          {subtitle}
        </button>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground/70">{subtitle}</span>
      )}

      {selected && <span className="shrink-0 text-xs text-primary">Selected</span>}

      {onRemove && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}
