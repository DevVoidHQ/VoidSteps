import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Select } from "./Select";
import { Dialog, DialogTitle } from "./Dialog";

it("navigates enabled options, supports typeahead and closes without dismissing its dialog", async () => {
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
  // Radix moves focus between options on the next tick, hence the waitFors.
  const trigger = screen.getByRole("combobox", { name: "Apple" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => expect(screen.getByRole("option", { name: "Apple" })).toHaveFocus());
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  await waitFor(() => expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus());
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  await waitFor(() => expect(screen.getByRole("option", { name: "Apple" })).toHaveFocus());
  fireEvent.keyDown(document.activeElement!, { key: "c" });
  await waitFor(() => expect(screen.getByRole("option", { name: "Cherry" })).toHaveFocus());
  fireEvent.keyDown(document.activeElement!, { key: "Enter" });
  expect(change).toHaveBeenCalledWith("c");
  await waitFor(() => expect(trigger).toHaveFocus());

  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});
