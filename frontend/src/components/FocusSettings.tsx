import { useRef } from "react";
import { Image, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FOCUS_BACKGROUNDS, focusBackgroundCss } from "@/lib/focus-background";
import { clearFocusMedia, setFocusMedia, useFocusMedia } from "@/lib/focus-media";
import { setFocusBackground, useFocusBackground } from "@/lib/preferences";
import { useToast } from "@/contexts/ToastContext";

/**
 * Focus mode appearance and sound.
 *
 * Everything here is local. The background presets are generated from the
 * active theme, and a picked image or track is held in the local database, so
 * nothing is fetched and nothing is uploaded.
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

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div>
          <h3 className="text-sm font-medium">Focus background</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Presets are drawn from your current theme, so they follow it when you switch.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FOCUS_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                aria-pressed={backgroundId === bg.id}
                onClick={() => setFocusBackground(bg.id)}
                className={`h-16 rounded-lg border bg-background text-xs transition ${
                  backgroundId === bg.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                }`}
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
                className={`h-16 rounded-lg border bg-cover bg-center text-xs transition ${
                  backgroundId === "custom" ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                }`}
                style={{ backgroundImage: `url("${wallpaperUrl}")` }}
              >
                <span className="rounded bg-background/70 px-1.5 py-0.5">Yours</span>
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <span className="max-w-[14rem] truncate text-xs text-muted-foreground">{wallpaperName}</span>
                <Button variant="ghost" size="sm" onClick={() => clear("wallpaper")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-medium">Focus sound</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            An audio file from your machine, looped while focus mode is open. Play and volume
            live in the focus view. Nothing streams and nothing is fetched.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <span className="max-w-[14rem] truncate text-xs text-muted-foreground">{audioName}</span>
                <Button variant="ghost" size="sm" onClick={() => clear("audio")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your image and track are not included in backups, because they would add tens of
          megabytes to every export. On a new machine, pick them again.
        </p>
      </CardContent>
    </Card>
  );
}
