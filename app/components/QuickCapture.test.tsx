import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { DataProvider } from "@/contexts/DataContext";
import { db } from "@/lib/db";
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
import QuickCapture from "./QuickCapture";

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function setup(onOpenChange = vi.fn()) {
  await db.steps.add({
    _id: "existing",
    title: "GST return filing",
    completed: false,
    prioritizedToday: false,
    createdAt: 1,
    updatedAt: 1,
  });
  render(
    <DataProvider>
      <QuickCapture open onOpenChange={onOpenChange} />
    </DataProvider>
  );
  const input = screen.getByPlaceholderText("What do you need to do?");
  fireEvent.change(input, { target: { value: "@tomorrow file GST return" } });
  const panel = await screen.findByRole("region", { name: "You may already have this" });
  return { input, panel, onOpenChange };
}

it("shows a near-matching open step while typing", async () => {
  const { panel } = await setup();
  expect(within(panel).getByText("GST return filing")).toBeInTheDocument();
});

it("merges into the existing step instead of creating one", async () => {
  const { panel, input } = await setup();
  fireEvent.click(within(panel).getByRole("button", { name: "Merge" }));
  await waitFor(async () =>
    expect((await db.steps.get("existing"))?.description).toBe("file GST return")
  );
  expect(await db.steps.count()).toBe(1);
  expect((await db.steps.get("existing"))?.dueDate).toBeDefined();
  expect(input).toHaveValue("");
});

it("still creates a new step on Enter", async () => {
  const { input } = await setup();
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(async () => expect(await db.steps.count()).toBe(2));
});

it("opens the existing step and closes the capture bar", async () => {
  // A real parent, so the bar actually closes and the step dialog outlives it.
  function Parent() {
    const [open, setOpen] = useState(true);
    return <QuickCapture open={open} onOpenChange={setOpen} />;
  }
  await db.steps.add({
    _id: "existing",
    title: "GST return filing",
    completed: false,
    prioritizedToday: false,
    createdAt: 1,
    updatedAt: 1,
  });
  render(
    <DataProvider>
      <Parent />
    </DataProvider>
  );
  fireEvent.change(screen.getByPlaceholderText("What do you need to do?"), {
    target: { value: "file GST return" },
  });
  const panel = await screen.findByRole("region", { name: "You may already have this" });
  fireEvent.click(within(panel).getByRole("button", { name: "Open" }));
  expect(await screen.findByDisplayValue("GST return filing")).toBeInTheDocument();
  expect(screen.queryByPlaceholderText("What do you need to do?")).not.toBeInTheDocument();
});

it("closes on Escape when focus is on a match button", async () => {
  const { panel, onOpenChange } = await setup();
  fireEvent.keyDown(within(panel).getByRole("button", { name: "Merge" }), { key: "Escape" });
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("closes the path list once a path is picked with Tab", async () => {
  await db.paths.add({
    _id: "p1",
    title: "Ship VoidSteps v1",
    createdAt: 1,
    updatedAt: 1,
  });
  render(
    <DataProvider>
      <QuickCapture open onOpenChange={vi.fn()} />
    </DataProvider>
  );
  const input = screen.getByPlaceholderText("What do you need to do?") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "test /Ship", selectionStart: 10 } });
  await screen.findByRole("listbox");
  fireEvent.keyDown(input, { key: "Tab" });
  await waitFor(() => expect(input.value).toBe("test /Ship VoidSteps v1 "));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
