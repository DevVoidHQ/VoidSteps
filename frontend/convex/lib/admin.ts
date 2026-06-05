// Server-side superadmin gate. The client-side isSeedAdmin allowlist is for UX
// only (hide/show); every privileged query/mutation/action MUST call this so the
// check can't be bypassed from a crafted client request.
//
// Configure with the Convex env var SUPERADMIN_EMAILS (comma-separated), e.g.
//   npx convex env set SUPERADMIN_EMAILS "you@devvoid.org,ops@devvoid.org"
import { requireAuth } from "./auth";

export async function requireSuperAdmin(ctx: { auth: any }): Promise<{ userId: string; email: string }> {
  await requireAuth(ctx);
  const identity = await ctx.auth.getUserIdentity();
  const email = (identity?.email as string | undefined)?.toLowerCase();
  if (!email) throw new Error("Forbidden");

  const raw = ((globalThis as any).process?.env?.SUPERADMIN_EMAILS as string | undefined) ?? "";
  const allow = raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allow.includes(email)) throw new Error("Forbidden");
  return { userId: identity!.subject, email };
}
