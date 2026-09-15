import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  relaunch: vi.fn(),
  enabled: vi.fn(() => true),
  report: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("./preferences", () => ({ getAutoUpdateCheck: mocks.enabled }));
vi.mock("./error-store", () => ({ reportError: mocks.report }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  mocks.enabled.mockReturnValue(true);
  Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
});
it("honors opt-out and throttling while allowing an explicit check", async () => {
  const updater = await import("./updater");
  mocks.enabled.mockReturnValue(false);
  await updater.runUpdateCheck();
  expect(mocks.check).not.toHaveBeenCalled();
  mocks.check.mockResolvedValue(null);
  await updater.runUpdateCheck(true);
  expect(mocks.check).toHaveBeenCalledTimes(1);
  mocks.enabled.mockReturnValue(true);
  await updater.runUpdateCheck();
  expect(mocks.check).toHaveBeenCalledTimes(1);
});
it("deduplicates concurrent checks and reports failures", async () => {
  const updater = await import("./updater");
  let reject!: (error: Error) => void;
  mocks.check.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      })
  );
  const { result } = renderHook(() => updater.useUpdaterStatus());
  await act(async () => {
    const pending = updater.runUpdateCheck(true);
    await updater.runUpdateCheck(true);
    expect(mocks.check).toHaveBeenCalledTimes(1);
    reject(new Error("Offline"));
    await pending;
  });
  expect(result.current).toEqual({ phase: "error", message: "Offline" });
  expect(localStorage.getItem("voidsteps-update-last-check")).toBeNull();
});
it("installs only on request and never restarts after a rejected payload", async () => {
  const updater = await import("./updater");
  const download = vi
    .fn()
    .mockRejectedValueOnce(new Error("Invalid signature"))
    .mockResolvedValue(undefined);
  mocks.check.mockResolvedValue({ version: "0.3.0", downloadAndInstall: download });
  await updater.runUpdateCheck(true);
  expect(download).not.toHaveBeenCalled();
  await updater.installUpdate();
  expect(mocks.relaunch).not.toHaveBeenCalled();
  await updater.runUpdateCheck(true);
  await updater.installUpdate();
  expect(mocks.relaunch).toHaveBeenCalledTimes(1);
});
