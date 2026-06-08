import { can, planOf, type Feature, type Plan } from "./entitlements";

// Shared auth guard. Single source for the identity check that every query /
// mutation runs first. Returns the Convex auth subject (our userId).
export async function requireAuth(ctx: { auth: any }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

// Server-authoritative plan. Reads the `plan` custom claim off the Clerk JWT.
// REQUIRES the Clerk "convex" JWT template to map it:
//   { "plan": "{{user.public_metadata.plan}}" }
// Without that claim every user reads as "free" -- which is why enforcement is
// gated behind ENTITLEMENTS_ENFORCED below (see requireFeature / isEnforced).
export async function getPlan(ctx: { auth: any }): Promise<Plan> {
  const identity = await ctx.auth.getUserIdentity();
  return planOf({ plan: (identity as { plan?: unknown } | null)?.plan });
}

// Master switch. Stays OFF until the Clerk JWT `plan` claim is configured;
// flip it on (no code change) with:  npx convex env set ENTITLEMENTS_ENFORCED true
export function isEnforced(): boolean {
  return (globalThis as any).process?.env?.ENTITLEMENTS_ENFORCED === "true";
}

/** Returns true if the caller's plan may write `feature` (or enforcement is off). */
export async function hasFeature(ctx: { auth: any }, feature: Feature): Promise<boolean> {
  if (!isEnforced()) return true;
  return can(await getPlan(ctx), feature);
}

/** Hard gate: throws UPGRADE_REQUIRED if the caller's plan lacks `feature`. */
export async function requireFeature(ctx: { auth: any }, feature: Feature): Promise<void> {
  await requireAuth(ctx);
  if (!(await hasFeature(ctx, feature))) throw new Error(`UPGRADE_REQUIRED:${feature}`);
}
