// Module-level mirror of "may the current user sync?" (Pro/Lifetime only).
// Set once from OfflineContext when the plan resolves, read by the enqueue()
// helpers across the local-write layer. Free users are LOCAL-ONLY: their writes
// must never enter the sync queue (nothing to drain, no phantom "pending"
// count, zero server cost). Defaults false so a write before the plan resolves
// stays local rather than leaking to the queue.
let syncEnabled = false;

export function setSyncEnabled(value: boolean): void {
  syncEnabled = value;
}

export function isSyncEnabled(): boolean {
  return syncEnabled;
}
