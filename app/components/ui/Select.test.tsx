import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Select } from "./Select";
import { Dialog, DialogTitle } from "./Dialog";

it("navigates enabled options, supports typeahead and closes without dismissing its dialog", () => {
  const change = vi.fn();
  const close = vi.fn();
  render(
    <Dialog open onOpenChange={close}>
      <DialogTitle>Settings</DialogTitle>
      <Select
        value="a"
        onValueChange={change}
        options={[
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana", disabled: true },
          { value: "c", label: "Cherry" },
        ]}
      />
    </Dialog>
  );
  const trigger = screen.getByRole("button", { name: "Apple" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: "Apple" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  expect(screen.getByRole("option", { name: "Apple" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "c" });
  expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus();
  fireEvent.click(document.activeElement!);
  expect(change).toHaveBeenCalledWith("c");
  expect(trigger).toHaveFocus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
