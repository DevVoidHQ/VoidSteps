import { describe, expect, it } from "vitest";
import type { Path, Step } from "@/types/index";
import {
  EMPTY_LENS,
  isLensActive,
  lensDigit,
  lensForDigit,
  lensPathIds,
  parseLens,
  stepInLens,
  type Lens,
} from "./lens";

const NOW = new Date(2026, 9, 15, 12).getTime();
const dayAt = (offset: number) => new Date(2026, 9, 15 + offset, 23, 59).getTime();

const step = (over: Partial<Step>): Step =>
  ({
    _id: "s",
    title: "t",
    completed: false,
    prioritizedToday: false,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }) as Step;

const paths: Path[] = [
  { _id: "work", title: "Work", createdAt: 0, updatedAt: 0 },
  { _id: "launch", title: "Launch", parentId: "work", createdAt: 0, updatedAt: 0 },
  { _id: "home", title: "Home", createdAt: 0, updatedAt: 0 },
] as Path[];

const lens = (over: Partial<Lens>): Lens => ({ ...EMPTY_LENS, ...over });
const inLens = (s: Step, l: Lens) => stepInLens(s, l, lensPathIds(l, paths), NOW);

describe("lens", () => {
  it("an empty lens keeps everything and is inactive", () => {
    expect(isLensActive(EMPTY_LENS)).toBe(false);
    expect(inLens(step({}), EMPTY_LENS)).toBe(true);
  });

  it("a path takes in its sub-paths and drops steps without a path", () => {
    const l = lens({ pathIds: ["work"] });
    expect(inLens(step({ pathId: "launch" }), l)).toBe(true);
    expect(inLens(step({ pathId: "home" }), l)).toBe(false);
    expect(inLens(step({}), l)).toBe(false);
  });

  it("due choices are ORed and use day buckets", () => {
    const l = lens({ due: ["overdue", "today"] });
    expect(inLens(step({ dueDate: dayAt(-2) }), l)).toBe(true);
    expect(inLens(step({ dueDate: dayAt(0) }), l)).toBe(true);
    expect(inLens(step({ dueDate: dayAt(3) }), l)).toBe(false);
    expect(inLens(step({ dueDate: dayAt(3) }), lens({ due: ["week"] }))).toBe(true);
    expect(inLens(step({ dueDate: dayAt(9) }), lens({ due: ["week"] }))).toBe(false);
    expect(inLens(step({}), lens({ due: ["none"] }))).toBe(true);
  });

  it("dimensions are ANDed", () => {
    const l = lens({ pathIds: ["work"], starred: "starred", kind: "routine" });
    expect(inLens(step({ pathId: "work", prioritizedToday: true, routineId: "r" }), l)).toBe(true);
    expect(inLens(step({ pathId: "work", prioritizedToday: true }), l)).toBe(false);
    expect(inLens(step({ pathId: "work", routineId: "r" }), l)).toBe(false);
  });

  it("parses stored lenses defensively", () => {
    expect(parseLens({ pathIds: ["a", 3], due: ["today", "soon"], kind: "x" })).toEqual({
      pathIds: ["a"],
      due: ["today"],
      kind: "all",
      starred: "all",
    });
    expect(parseLens(null)).toEqual(EMPTY_LENS);
  });
});

describe("lens shortcuts", () => {
  const saved = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}` }));
  it("puts Everything on ⌘1 and saved lenses on ⌘2 to ⌘9", () => {
    expect(lensForDigit(1, saved)).toBeNull();
    expect(lensForDigit(2, saved)).toBe("l0");
    expect(lensForDigit(9, saved)).toBe("l7");
    expect(lensForDigit(3, [{ id: "only" }])).toBeUndefined();
    expect([0, 7, 8].map(lensDigit)).toEqual([2, 9, undefined]);
  });
});
