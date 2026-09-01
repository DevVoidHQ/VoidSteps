import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_TRACKS,
  CUSTOM_TRACK_ID,
  TRACK_ARTIST,
  TRACK_LICENCE,
  findBundledTrack,
} from "./focus-tracks";

const REPO = join(__dirname, "..", "..", "..");
const AUDIO_DIR = join(REPO, "frontend", "public", "audio");
const CREDITS = readFileSync(join(REPO, "CREDITS.md"), "utf8");

describe("bundled tracks", () => {
  it("every declared track has a file on disk", () => {
    const onDisk = new Set(readdirSync(AUDIO_DIR));
    for (const t of BUNDLED_TRACKS) {
      expect(onDisk, `${t.id} is declared but missing`).toContain(t.src.replace("/audio/", ""));
    }
  });

  it("every shipped audio file is declared", () => {
    // The direction that matters: a stray file in public/audio would ship to
    // users without ever appearing in the picker or in CREDITS.md.
    const declared = new Set(BUNDLED_TRACKS.map((t) => t.src.replace("/audio/", "")));
    for (const f of readdirSync(AUDIO_DIR).filter((n: string) => !n.startsWith("."))) {
      expect(declared, `${f} ships but is not declared`).toContain(f);
    }
  });

  it("every shipped audio file is credited by path", () => {
    // The licence obligation. CC0 asks for nothing, but the repo rule from
    // PVT-291 is that provenance is recorded per asset, and that rule only
    // holds if something checks it.
    for (const t of BUNDLED_TRACKS) {
      expect(CREDITS, `${t.src} is not in CREDITS.md`).toContain(`public/audio/${t.id}.mp3`);
    }
  });

  it("states the artist and licence, and CREDITS.md agrees", () => {
    expect(TRACK_ARTIST).toBeTruthy();
    expect(TRACK_LICENCE).toBe("CC0 1.0 Universal");
    expect(CREDITS).toContain(TRACK_ARTIST);
    expect(CREDITS).toContain(TRACK_LICENCE);
  });

  it("serves tracks from public/, not through a bundler import", () => {
    // A root-relative path keeps ~29MB of audio out of the JS bundle.
    for (const t of BUNDLED_TRACKS) expect(t.src.startsWith("/audio/")).toBe(true);
  });

  it("uses ids that cannot collide with the custom-track sentinel", () => {
    expect(BUNDLED_TRACKS.map((t) => t.id)).not.toContain(CUSTOM_TRACK_ID);
  });

  it("resolves a known id and refuses an unknown one", () => {
    expect(findBundledTrack(BUNDLED_TRACKS[0].id)?.title).toBe(BUNDLED_TRACKS[0].title);
    expect(findBundledTrack(CUSTOM_TRACK_ID)).toBeUndefined();
    expect(findBundledTrack(null)).toBeUndefined();
  });
});
