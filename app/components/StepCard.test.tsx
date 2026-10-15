import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { closeStep, openStep } from "@/lib/expanded-step";
import { ToastProvider } from "@/contexts/ToastContext";
import { StepCard } from "./StepCard";

// A timer started and stopped within the minimum session length mints no time
// entry but leaves totalTimeSpentMs at 0, not undefined. `0 && ...` in JSX
// renders a bare "0", which showed up on the card.
it("shows no stray 0 for a step with zero tracked time", () => {
  render(
    <ToastProvider>
      <StepCard
        step={{
          _id: "s1",
          title: "Write the report",
          completed: false,
          prioritizedToday: true,
          totalTimeSpentMs: 0,
          createdAt: 0,
          updatedAt: 0,
        }}
        paths={[]}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onTogglePriority={vi.fn()}
        onSaveEdit={vi.fn()}
        onToggleTimer={vi.fn()}
      />
    </ToastProvider>
  );
  expect(screen.getByText("Write the report")).toBeInTheDocument();
  expect(screen.queryByText("0")).not.toBeInTheDocument();
});

afterEach(() => act(() => closeStep()));

function renderCard(overrides: Partial<Parameters<typeof StepCard>[0]> = {}) {
  const props = {
    step: {
      _id: "s2",
      title: "Plan the week",
      description: "Review goals first",
      completed: false,
      prioritizedToday: false,
      createdAt: 0,
      updatedAt: 0,
    },
    paths: [],
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onTogglePriority: vi.fn(),
    onSaveEdit: vi.fn(),
    onToggleTimer: vi.fn(),
    onToggleFailed: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <StepCard {...props} />
    </ToastProvider>
  );
  return props;
}

it("opens its details on click and closes on Escape", () => {
  renderCard();
  expect(screen.queryByText("Review goals first")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Plan the week"));
  expect(screen.getByText("Review goals first")).toBeInTheDocument();
  expect(screen.getByRole("toolbar", { name: "Step actions" })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByText("Review goals first")).not.toBeInTheDocument();
});

it("runs strip actions with the number keys while open", () => {
  const props = renderCard();
  act(() => openStep("s2"));
  fireEvent.keyDown(window, { key: "1" }); // Complete
  expect(props.onToggle).toHaveBeenCalledWith("s2");
  fireEvent.keyDown(window, { key: "1", metaKey: true }); // ⌘1 is the lens switch
  expect(props.onToggle).toHaveBeenCalledTimes(1);
});

it("ignores number keys while closed", () => {
  const props = renderCard();
  fireEvent.keyDown(window, { key: "1" });
  expect(props.onToggle).not.toHaveBeenCalled();
});

it("postpones by any amount from the open card", () => {
  const props = renderCard();
  act(() => openStep("s2"));
  fireEvent.click(screen.getByRole("button", { name: /Postpone…/ }));
  const field = screen.getByLabelText("Postpone by");
  fireEvent.change(field, { target: { value: "3d" } });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(props.onSaveEdit).toHaveBeenCalledWith("s2", { dueDate: expect.any(Number) });
  expect(screen.queryByLabelText("Postpone by")).not.toBeInTheDocument();
});

it("keeps only the fixed quick buttons on a closed card", () => {
  renderCard();
  for (const name of ["Postpone to tomorrow", "Start timer", "Prioritize", "Mark failed"]) {
    expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
  }
  expect(screen.queryByRole("button", { name: "Edit step" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
});

it("orders the quick buttons start, star, postpone, fail", () => {
  renderCard();
  const names = screen
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label"))
    .filter((n): n is string =>
      ["Start timer", "Prioritize", "Postpone to tomorrow", "Mark failed"].includes(n ?? "")
    );
  expect(names).toEqual(["Start timer", "Prioritize", "Postpone to tomorrow", "Mark failed"]);
});
