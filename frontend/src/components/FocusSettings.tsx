import { useRef } from "react";
import { Image, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FOCUS_BACKGROUNDS, focusBackgroundCss } from "@/lib/focus-background";
import { clearFocusMedia, setFocusMedia, useFocusMedia } from "@/lib/focus-media";
import { setFocusBackground, useFocusBackground } from "@/lib/preferences";
import { useToast } from "@/contexts/ToastContext";

/**
 * Focus mode appearance and sound.
 *
 * Renders flat, as two sibling blocks matching every other setting on the
 * panel. It sits inside the panel's own Card, so wrapping it in another one
 * would draw a border inside a border.
 *
 * Everything here is local: presets are generated from the active theme, and a
 * picked image or track lives in the local database. Nothing is fetched.
 */
export default function FocusSettings() {
  const toast = useToast();
  const backgroundId = useFocusBackground();
  const { url: wallpaperUrl, name: wallpaperName } = useFocusMedia("wallpaper");
  const { name: audioName } = useFocusMedia("audio");

  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  const pick = async (kind: "wallpaper" | "audio", file: File | undefined) => {
    if (!file) return;
    try {
      await setFocusMedia(kind, file);
      if (kind === "wallpaper") setFocusBackground("custom");
      toast.success(kind === "wallpaper" ? "Wallpaper set" : "Track set");
    } catch {
      toast.error("Could not read that file");
    }
  };

  const clear = async (kind: "wallpaper" | "audio") => {
    await clearFocusMedia(kind);
    if (kind === "wallpaper" && backgroundId === "custom") {
      setFocusBackground(FOCUS_BACKGROUNDS[0].id);
    }
  };

  // Selection reads as a ring, not a border, so unselected swatches carry no
  // outline at all and the grid stays quiet.
  const swatch = (selected: boolean) =>
    `h-14 rounded-lg text-xs font-medium transition ${
      selected ? "ring-2 ring-primary" : "ring-1 ring-border/40 hover:ring-border"
    }`;

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Focus background</label>
        <p className="text-sm text-muted-foreground">
          Presets are drawn from your current theme, so they follow it when you switch.
        </p>

        <div className="grid max-w-xl grid-cols-3 gap-2 pt-1">
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
              aria-pressed={backgroundId === "custom"}
              onClick={() => setFocusBackground("custom")}
              className={`${swatch(backgroundId === "custom")} bg-cover bg-center`}
              style={{ backgroundImage: `url("${wallpaperUrl}")` }}
            >
              <span className="rounded bg-background/70 px-1.5 py-0.5">Yours</span>
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
              <span className="max-w-[14rem] truncate text-sm text-muted-foreground">{wallpaperName}</span>
              <Button variant="ghost" size="sm" onClick={() => clear("wallpaper")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Focus sound</label>
        <p className="text-sm text-muted-foreground">
          An audio file from your machine, looped while focus mode is open. Play and volume live
          in the focus view. Nothing streams and nothing is fetched, and it is not included in
          backups, so pick it again on a new machine.
        </p>

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
            {audioName ? "Replace track" : "Choose a track"}
          </Button>
          {audioName && (
            <>
              <span className="max-w-[14rem] truncate text-sm text-muted-foreground">{audioName}</span>
              <Button variant="ghost" size="sm" onClick={() => clear("audio")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
