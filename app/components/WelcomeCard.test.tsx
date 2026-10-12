import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/contexts/DataContext", () => ({
  useData: () => ({ activePaths: [{ _id: "p", title: "Getting Started" }] }),
}));
import WelcomeCard from "./WelcomeCard";

const KEY = "voidsteps-welcome-dismissed";

afterEach(() => {
  localStorage.clear();
});

function renderCard() {
  return render(
    <MemoryRouter>
      <WelcomeCard />
    </MemoryRouter>
  );
}

it("defines path, step and prioritized for today", () => {
  renderCard();
  expect(screen.getByText("Welcome to VoidSteps")).toBeInTheDocument();
  expect(screen.getByText("Path")).toBeInTheDocument();
  expect(screen.getByText("Step")).toBeInTheDocument();
  expect(screen.getByText("Prioritized for today")).toBeInTheDocument();
  expect(screen.getByText(/Try the three steps in Getting Started/)).toBeInTheDocument();
});

it("dismisses for good in one click on Got it", () => {
  renderCard();
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(localStorage.getItem(KEY)).toBe("true");
  expect(screen.queryByText("Welcome to VoidSteps")).not.toBeInTheDocument();
});

it("dismisses in one click on the close button", () => {
  renderCard();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(localStorage.getItem(KEY)).toBe("true");
  expect(screen.queryByText("Welcome to VoidSteps")).not.toBeInTheDocument();
});

it("renders nothing once dismissed", () => {
  localStorage.setItem(KEY, "true");
  const { container } = renderCard();
  expect(container).toBeEmptyDOMElement();
});
