import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Dialog, DialogTitle, DialogDescription } from "./Dialog";

it("names the dialog, traps focus and restores its trigger on close", async () => {
  const close = vi.fn();
  function View({ open }: { open: boolean }) {
    return (
      <>
        <button>Open</button>
        <Dialog open={open} onOpenChange={close}>
          <DialogTitle>Confirm deletion</DialogTitle>
          <DialogDescription>Choose an action</DialogDescription>
          <button>Cancel</button>
          <button>Delete</button>
        </Dialog>
      </>
    );
  }
  const ui = render(<View open={false} />);
  const trigger = screen.getByText("Open");
  trigger.focus();
  ui.rerender(<View open />);
  expect(screen.getByRole("dialog", { name: "Confirm deletion" })).toHaveAccessibleDescription(
    "Choose an action"
  );
  expect(screen.getByText("Cancel")).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
  expect(screen.getByText("Delete")).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(screen.getByText("Cancel")).toHaveFocus();
  trigger.focus();
  expect(screen.getByText("Cancel")).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(close).toHaveBeenCalledWith(false);
  ui.rerender(<View open={false} />);
  // Radix hands focus back on the next tick, after the content unmounts.
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("leaves Escape to an inline editor that owns it", () => {
  const close = vi.fn();
  const cancel = vi.fn();
  render(
    <Dialog open onOpenChange={close}>
      <DialogTitle>Time</DialogTitle>
      <div
        data-own-escape
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
      >
        <input aria-label="Start time" />
      </div>
    </Dialog>
  );
  fireEvent.keyDown(screen.getByLabelText("Start time"), { key: "Escape" });
  expect(cancel).toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
