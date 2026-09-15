import { expect, it, vi } from "vitest";
import { db } from "./db";
import { reportError } from "./error-store";
it("does not reject when error logging hits the same storage failure", async () => {
  const spy = vi.spyOn(db.errorLog, "add").mockRejectedValueOnce(new Error("Quota exceeded"));
  try {
    await expect(reportError("mutation", new Error("Original failure"))).resolves.toBeUndefined();
  } finally {
    spy.mockRestore();
  }
});
