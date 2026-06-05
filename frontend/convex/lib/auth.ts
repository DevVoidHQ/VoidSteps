// Shared auth guard. Single source for the identity check that every query /
// mutation runs first. Returns the Convex auth subject (our userId).
export async function requireAuth(ctx: { auth: any }): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}
