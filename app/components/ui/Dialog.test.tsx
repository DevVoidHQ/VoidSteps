import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Dialog, DialogTitle, DialogDescription } from "./Dialog";

it("names the dialog, traps focus and restores its trigger on close", () => {
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
  expect(trigger).toHaveFocus();
});
