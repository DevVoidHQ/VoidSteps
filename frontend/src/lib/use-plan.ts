// Client-side plan hooks. UX gates ONLY -- every real wall is re-checked
// server-side (notes via batch/requireFeature) or is cost-controlled client
// data (sync cadence) / zero-cost cosmetics (themes, analytics view). Reads the
// plan straight off Clerk publicMetadata so it works offline once loaded.
import { useUser } from "@clerk/clerk-react";
import { can, planOf, canUseTheme, type Feature, type Plan } from "../../convex/lib/entitlements";

export type { Plan, Feature };
export { canUseTheme };

export function usePlan(): Plan {
  const { user } = useUser();
  return planOf(user?.publicMetadata);
}

export function useCan(feature: Feature): boolean {
  return can(usePlan(), feature);
}
