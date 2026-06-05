// Pure client-side admin allowlist check (UX gate only - every privileged
// Convex function re-checks server-side via requireSuperAdmin). Kept dependency
// free (just import.meta.env) so the admin page can import it without pulling in
// the sync/db stack, keeping admin extractable into a standalone app later.
export function isSeedAdmin(email: string | null | undefined): boolean {
  if (import.meta.env.DEV) return true;
  const raw = (import.meta.env.VITE_SEED_ADMIN_EMAILS as string | undefined) ?? "";
  const allow = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}
