import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "./autosave";

afterEach(() => vi.useRealTimers());
describe("autosave", () => {
  it("cancels an edit when undo returns to the saved value", async () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const queue = createAutosave({ initial: "A", save });
    queue.schedule("B");
    queue.schedule("A");
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });
  it("writes an undo after an in-flight edit, with no concurrent writes", async () => {
    let finish!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValue(undefined);
    const queue = createAutosave({ initial: "A", save });
    queue.schedule("B");
    const pending = queue.flush();
    await Promise.resolve();
    queue.schedule("A");
    expect(queue.flush()).toBe(pending);
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await expect(pending).resolves.toBe(true);
    expect(save.mock.calls).toEqual([["B"], ["A"]]);
  });
  it("retains the newest edit on failure and retries on the next flush", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Storage full"))
      .mockResolvedValue(undefined);
    const queue = createAutosave({ initial: "A", save });
    queue.schedule("B");
    await expect(queue.flush()).resolves.toBe(false);
    await expect(queue.flush()).resolves.toBe(true);
    expect(save.mock.calls).toEqual([["B"], ["B"]]);
  });
});
