import { afterEach, expect, it } from "vitest";
import { getFocusVolume, setFocusVolume } from "./preferences";

afterEach(() => localStorage.clear());

it("defaults focus volume to half when nothing is saved", () => {
  expect(getFocusVolume()).toBe(0.5);
});

it("keeps a saved volume, including muted", () => {
  setFocusVolume(0.8);
  expect(getFocusVolume()).toBe(0.8);
  setFocusVolume(0);
  expect(getFocusVolume()).toBe(0);
});
