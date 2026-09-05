/**
 * The bundled focus-mode audio library.
 *
 * Five instrumental lofi tracks by HoliznaCC0, from his "Public Domain Lofi"
 * album, each published under CC0 1.0 Universal. They ship with the app rather
 * than streaming, so focus mode has sound out of the box and still makes no
 * network request.
 *
 * CC0 requires no attribution. We credit him anyway, in the UI and in
 * CREDITS.md, because giving work away this freely deserves the mention.
 *
 * Adding a track here means adding a row to CREDITS.md with its source and
 * licence. A file whose licence has not been checked does not go in.
 */

export interface BundledTrack {
  id: string;
  title: string;
  /** Served from public/, so this is a root-relative path, not an import. */
  src: string;
}

export const TRACK_ARTIST = "HoliznaCC0";
export const TRACK_LICENCE = "CC0 1.0 Universal";
export const TRACK_SOURCE_URL = "https://freemusicarchive.org/music/holiznacc0/public-domain-lofi";

export const BUNDLED_TRACKS: BundledTrack[] = [
  { id: "tokyo-sunset", title: "Tokyo Sunset", src: "/audio/tokyo-sunset.mp3" },
  { id: "calm-currents", title: "Calm Currents", src: "/audio/calm-currents.mp3" },
  { id: "peaceful-drift", title: "Peaceful Drift", src: "/audio/peaceful-drift.mp3" },
  { id: "theta-frequency", title: "Theta Frequency", src: "/audio/theta-frequency.mp3" },
  { id: "ease-into-night", title: "Ease into Night", src: "/audio/ease-into-night.mp3" },
];

/** "custom" means the file the user picked, held in the local database. */
export const CUSTOM_TRACK_ID = "custom";

export function findBundledTrack(id: string | null | undefined): BundledTrack | undefined {
  return BUNDLED_TRACKS.find((t) => t.id === id);
}
