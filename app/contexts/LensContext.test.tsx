import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LensProvider, useLens } from "./LensContext";

vi.mock("./DataContext", () => ({ useData: () => ({}) }));

afterEach(() => localStorage.clear());

function Names() {
  const { saved, activeId } = useLens();
  return (
    <ul>
      {saved.map((s) => (
        <li key={s.id}>
          {s.name}
          {s.id === activeId ? " (active)" : ""}
        </li>
      ))}
    </ul>
  );
}

it("turns an old path filter into an active lens, even under StrictMode", () => {
  localStorage.setItem("voidsteps-path-filter", "work");
  render(
    <StrictMode>
      <LensProvider>
        <Names />
      </LensProvider>
    </StrictMode>
  );
  expect(screen.getByText("Path filter (active)")).toBeInTheDocument();
  expect(localStorage.getItem("voidsteps-path-filter")).toBeNull();
  expect(JSON.parse(localStorage.getItem("voidsteps-saved-lenses")!)).toHaveLength(1);
});
