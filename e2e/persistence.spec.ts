import { expect, test, type Page } from "@playwright/test";

function snapshot(stepCount = 1) {
  const now = Date.now();
  return {
    format: "voidsteps-snapshot",
    version: 1,
    createdAt: now,
    source: "browser test",
    data: {
      paths: [{ _id: "path", title: "Work", createdAt: now, updatedAt: now }],
      steps: Array.from({ length: stepCount }, (_, index) => ({
        _id: `s-${index}`,
        title: `Task ${index}`,
        pathId: "path",
        completed: index > 9,
        prioritizedToday: false,
        createdAt: now,
        updatedAt: now,
        ...(index > 9 ? { completedAt: now - 86400000 } : {}),
      })),
      notebooks: [{ _id: "nb", title: "Notebook", createdAt: now, updatedAt: now }],
      notes: [
        {
          _id: "note",
          notebookId: "nb",
          title: "Test note",
          body: "Original text",
          createdAt: now,
          updatedAt: now,
        },
      ],
      timeEntries: [
        {
          _id: "orphan",
          stepId: "deleted",
          stepTitle: "Deleted private task",
          start: now - 61000,
          end: now - 1000,
          durationMs: 60000,
          source: "manual",
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  };
}

async function dataSettings(page: Page) {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Data", exact: true }).click();
}

async function restore(page: Page, data: unknown) {
  await dataSettings(page);
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("button", { name: "Replace my data" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function rows(page: Page, table: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("voidsteps");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => {
            db.close();
            resolve(request.result);
          };
          request.onerror = () => {
            db.close();
            reject(request.error);
          };
        };
      }),
    table
  );
}

test("exports, restores and erases retained history through Settings", async ({ page }) => {
  await restore(page, snapshot());
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export a backup" }).click();
  const backup = await download;
  const stream = await backup.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.data.notes[0].body).toBe("Original text");
  expect(exported.data.timeEntries).toHaveLength(1);
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByPlaceholder("DELETE").fill("DELETE");
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => rows(page, "timeEntries")).toEqual([]);
  await restore(page, exported);
  expect((await rows(page, "notes"))[0].body).toBe("Original text");
});

test("renders each route with 10,000 historical steps", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const started = performance.now();
  await restore(page, snapshot(10000));
  const timings: Record<string, number> = { importMs: Math.round(performance.now() - started) };
  for (const route of [
    "/",
    "/steps",
    "/paths",
    "/routines",
    "/reminders",
    "/analytics",
    "/notes",
    "/settings",
  ]) {
    const at = performance.now();
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    timings[route] = Math.round(performance.now() - at);
  }
  await testInfo.attach("route-timings", {
    body: JSON.stringify(timings, null, 2),
    contentType: "application/json",
  });
  console.log("10k step browser profile", timings);
  expect(errors).toEqual([]);
});
