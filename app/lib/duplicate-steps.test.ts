import { describe, expect, it } from "vitest";
import type { Step } from "@/types/index";
import { findSimilarSteps, stepTokens } from "./duplicate-steps";

let nextId = 0;
function step(title: string, extra: Partial<Step> = {}): Step {
  nextId += 1;
  return {
    _id: `s${nextId}`,
    title,
    completed: false,
    prioritizedToday: false,
    createdAt: nextId,
    updatedAt: nextId,
    ...extra,
  };
}

const titles = (steps: Step[]) => steps.map((s) => s.title);

describe("stepTokens", () => {
  it("ignores case, punctuation and stopwords", () => {
    expect(stepTokens("File the GST-return, for my taxes!")).toEqual(
      new Set(["fil", "gst", "return", "tax"])
    );
  });

  it("stems one suffix and then a trailing e", () => {
    expect(stepTokens("file filing filed files")).toEqual(new Set(["fil"]));
    // "es" would leave two letters, so only the "s" goes, then the "e".
    expect(stepTokens("goes")).toEqual(new Set(["go"]));
    // Never stems a word below its floor.
    expect(stepTokens("going be red")).toEqual(new Set(["going", "be", "red"]));
  });

  it("returns an empty set for a title of only stopwords or symbols", () => {
    expect(stepTokens("  the / @ * ")).toEqual(new Set());
  });
});

describe("findSimilarSteps", () => {
  it("matches a re-described title with the same words", () => {
    const existing = step("GST return filing");
    expect(findSimilarSteps("file GST return", [existing, step("Buy milk")])).toEqual([existing]);
  });

  it("matches when most words overlap", () => {
    expect(titles(findSimilarSteps("submit GST filing", [step("File GST return")]))).toEqual([
      "File GST return",
    ]);
  });

  it("does not match on a single shared word", () => {
    expect(findSimilarSteps("buy milk", [step("Buy a car")])).toEqual([]);
  });

  it("matches a one-word exact duplicate", () => {
    expect(titles(findSimilarSteps("Groceries", [step("groceries!")]))).toEqual(["groceries!"]);
  });

  it("compares open steps only, deferred included", () => {
    const steps = [
      step("Renew passport", { completed: true }),
      step("Renew passport", { failed: true }),
      step("Renew passport", { archived: true }),
      step("Renew passport", { startDate: Date.now() + 7 * 86_400_000 }),
    ];
    expect(findSimilarSteps("renew passport", steps)).toEqual([steps[3]]);
  });

  it("orders by score then newest, and respects the limit", () => {
    const partial = step("Book dentist appointment Friday");
    const olderExact = step("Book dentist appointment", { updatedAt: 1 });
    const newerExact = step("book the dentist appointment", { updatedAt: 2 });
    const unrelated = step("Water plants");
    const all = [partial, olderExact, newerExact, unrelated];
    expect(findSimilarSteps("Book dentist appointment", all)).toEqual([
      newerExact,
      olderExact,
      partial,
    ]);
    expect(findSimilarSteps("Book dentist appointment", all, 2)).toEqual([newerExact, olderExact]);
  });

  it("returns nothing for an empty title", () => {
    expect(findSimilarSteps("", [step("Anything")])).toEqual([]);
    expect(findSimilarSteps("the", [step("the")])).toEqual([]);
  });
});
