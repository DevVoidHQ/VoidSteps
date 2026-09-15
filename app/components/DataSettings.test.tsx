import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
import DataSettings from "./DataSettings";

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
it("allows deleting orphan history when there are no primary entities", async () => {
  await db.timeEntries.add({
    _id: "history",
    stepId: "deleted",
    stepTitle: "Private",
    start: 1,
    end: 2,
    durationMs: 1,
    source: "timer",
    createdAt: 1,
    updatedAt: 1,
  });
  render(<DataSettings />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Delete everything" })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete everything" }));
  fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
  const dialog = screen.getByRole("dialog");
  fireEvent.click(
    Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Delete")!
  );
  await waitFor(async () => expect(await db.timeEntries.count()).toBe(0));
});
