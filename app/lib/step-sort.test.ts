import { describe, expect, it } from "vitest";
import type { Path, Step } from "@/types/index";
import { sortSteps } from "./step-sort";

const s = (id: string, over: Partial<Step> = {}): Step =>
  ({
    _id: id,
    title: id,
    completed: false,
    prioritizedToday: true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }) as Step;
const paths = [
  { _id: "b", title: "Beta" },
  { _id: "a", title: "Alpha" },
] as Path[];

describe("sortSteps", () => {
  const steps = [
    s("x", { dueDate: 30, pathId: "b", createdAt: 1 }),
    s("y", { createdAt: 3 }),
    s("z", { dueDate: 10, pathId: "a", createdAt: 2 }),
  ];
  const ids = (list: Step[]) => list.map((t) => t._id);

  it("keeps the manual order untouched", () => {
    expect(sortSteps(steps, "manual", paths)).toBe(steps);
  });
  it("sorts by due date with undated last", () => {
    expect(ids(sortSteps(steps, "due", paths))).toEqual(["z", "x", "y"]);
  });
  it("sorts by path title with pathless last", () => {
    expect(ids(sortSteps(steps, "path", paths))).toEqual(["z", "x", "y"]);
  });
  it("sorts newest first", () => {
    expect(ids(sortSteps(steps, "newest", paths))).toEqual(["y", "z", "x"]);
  });
});
