import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createPath } from "@/lib/mutations/paths";
import { useFirstRun } from "./useFirstRun";

afterEach(async () => {
  localStorage.clear();
  await Promise.all(db.tables.map((t) => t.clear()));
});

function Probe() {
  useFirstRun();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="path">{useLocation().pathname}</div>
      <button onClick={() => navigate("/steps")}>Go to steps</button>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
    </MemoryRouter>
  );
}

it("seeds an empty profile and lands on Paths from the default route", async () => {
  renderAt("/");
  await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent("/paths"));
  expect(await db.paths.count()).toBe(1);
  expect(await db.steps.count()).toBe(3);
});

it("seeds but stays put when launched somewhere other than the default route", async () => {
  renderAt("/settings");
  await waitFor(async () => expect(await db.steps.count()).toBe(3));
  expect(screen.getByTestId("path")).toHaveTextContent("/settings");
});

it("does not pull someone back to Paths who navigated while the seed ran", async () => {
  renderAt("/");
  // Synchronous, so it lands before the IndexedDB transaction resolves.
  fireEvent.click(screen.getByRole("button", { name: "Go to steps" }));
  await waitFor(async () => expect(await db.steps.count()).toBe(3));
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByTestId("path")).toHaveTextContent("/steps");
});

it("leaves an existing profile alone and does not redirect", async () => {
  await createPath({ title: "Mine" });
  renderAt("/");
  // Give the background seed a chance to run and decide.
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByTestId("path")).toHaveTextContent(/^\/$/);
  expect(await db.paths.count()).toBe(1);
  expect(await db.steps.count()).toBe(0);
});

it("does nothing once the welcome has been dismissed", async () => {
  localStorage.setItem("voidsteps-welcome-dismissed", "true");
  renderAt("/");
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByTestId("path")).toHaveTextContent(/^\/$/);
  expect(await db.paths.count()).toBe(0);
});
