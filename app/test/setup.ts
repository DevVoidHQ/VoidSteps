import "@testing-library/jest-dom/vitest";

// Real IndexedDB, in-memory, so Dexie code under test (local-mutations,
// snapshot, ...) runs against the actual engine rather than a mock. Each test
// file that touches `db` should reset state between tests, e.g.:
//
//   import { db } from '../lib/db';
//   afterEach(async () => {
//     await Promise.all(db.tables.map((t) => t.clear()));
//   });
//
// `db` is a module-level singleton (one physical database per process), so
// clearing tables rather than recreating the database is what keeps tests
// isolated without fighting Dexie's open/close lifecycle.
import "fake-indexeddb/auto";

// jsdom lacks the pointer capture and scrolling APIs Radix Select calls when it
// opens. They do nothing useful in a DOM without layout, so stubs are enough.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
