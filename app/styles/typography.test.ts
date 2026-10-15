import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Text sizes are decided in app/styles/typography.css and nowhere else. A raw
// size anywhere in app/ means the scale has started to drift again.
const RAW_SIZE =
  /(^|[\s"'`:])text-(xs|sm|base|lg|xl|[2-9]xl)\b|text-\[[0-9.]+(px|rem|em)\]|fontSize:/;

const appDir = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("typography", () => {
  it("no component sets a raw text size; use a type-* role", () => {
    const offenders = sourceFiles(appDir).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i, lines) => ({ line, i, prev: lines[i - 1] ?? "" }))
        // A line may opt out with a "type-exempt:" comment directly above it,
        // which has to say why (SVG text, a preview of a size, ...).
        .filter(({ line, prev }) => RAW_SIZE.test(line) && !prev.includes("type-exempt:"))
        .map(({ line, i }) => `${relative(appDir, file)}:${i + 1}  ${line.trim()}`)
    );
    expect(offenders).toEqual([]);
  });
});
