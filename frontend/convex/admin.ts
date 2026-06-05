import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { requireSuperAdmin } from "./lib/admin";

// Client gate: returns true only for SUPERADMIN_EMAILS. Returns false (instead
// of throwing) so the admin page can redirect non-admins cleanly. This is the
// single source of truth for "am I admin?" - no client-side email allowlist.
export const amISuperAdmin = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    try {
      await requireSuperAdmin(ctx);
      return true;
    } catch {
      return false;
    }
  },
});

export type PerUserStats = {
  paths: number;
  steps: number;
  completed: number; // all-time completed steps
  active: number; // incomplete, non-archived, non-failed steps (current backlog)
  completed7d: number; // steps completed in the last 7 days (engagement signal)
  routines: number;
  notes: number;
  reminders: number;
  lastActive: number; // max updatedAt across entities, 0 if none
  joined: number; // min createdAt across entities, 0 if none
};

// Aggregate per-user usage from existing tables. NOTE: this only sees users who
// SYNC (Pro / comped) - free users never write to Convex, so they appear in the
// Clerk roster (listUsers) with zero stats here. That gap is intentional: a
// signed-up user with no stats = unconverted free user. Full table scans are
// fine at current scale; revisit (paginate / denormalize) if rows explode.
export const userStats = query({
  args: {},
  handler: async (ctx): Promise<Record<string, PerUserStats>> => {
    await requireSuperAdmin(ctx);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const acc: Record<string, PerUserStats> = {};
    const get = (userId?: string): PerUserStats | null => {
      if (!userId) return null;
      if (!acc[userId]) {
        acc[userId] = {
          paths: 0, steps: 0, completed: 0, active: 0, completed7d: 0,
          routines: 0, notes: 0, reminders: 0, lastActive: 0, joined: 0,
        };
      }
      return acc[userId];
    };
    const stamp = (s: PerUserStats, doc: { createdAt: number; updatedAt: number }) => {
      if (doc.updatedAt > s.lastActive) s.lastActive = doc.updatedAt;
      if (s.joined === 0 || doc.createdAt < s.joined) s.joined = doc.createdAt;
    };

    for (const p of await ctx.db.query("paths").collect()) {
      const s = get(p.userId); if (s) { s.paths++; stamp(s, p); }
    }
    for (const st of await ctx.db.query("steps").collect()) {
      const s = get(st.userId);
      if (s) {
        s.steps++;
        if (st.completed) {
          s.completed++;
          if ((st.completedAt ?? 0) >= sevenDaysAgo) s.completed7d++;
        } else if (!st.archived && !st.failed) {
          s.active++;
        }
        stamp(s, st);
      }
    }
    for (const r of await ctx.db.query("routines").collect()) {
      const s = get(r.userId); if (s) { s.routines++; stamp(s, r); }
    }
    for (const n of await ctx.db.query("notes").collect()) {
      const s = get(n.userId); if (s) { s.notes++; stamp(s, n); }
    }
    for (const rm of await ctx.db.query("reminders").collect()) {
      const s = get(rm.userId); if (s) { s.reminders++; stamp(s, rm); }
    }

    return acc;
  },
});

export type AdminUser = {
  userId: string;
  email: string | null;
  plan: string;
  createdAt: number | null;
  lastSignInAt: number | null;
  stats: PerUserStats | null;
};

const CLERK_API = "https://api.clerk.com/v1";

// Convex's action runtime provides a global fetch; the convex tsconfig has no
// DOM lib, so reach it through globalThis with a minimal signature.
const httpFetch = (globalThis as any).fetch as (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json: () => Promise<any>;
}>;

function clerkHeaders(): Record<string, string> {
  const key = (globalThis as any).process?.env?.CLERK_SECRET_KEY as string | undefined;
  if (!key) throw new Error("CLERK_SECRET_KEY not configured");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type UsersPage = {
  users: AdminUser[];
  total: number;
  offset: number;
  limit: number;
};

// One page of the roster (free + pro) from Clerk, merged with Convex usage
// stats. Offset-paginated via Clerk's limit/offset; `total` drives the pager.
export const listUsers = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<UsersPage> => {
    await requireSuperAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const offset = Math.max(args.offset ?? 0, 0);

    const stats: Record<string, PerUserStats> = await ctx.runQuery(api.admin.userStats, {});

    // Page of users + grand total (separate Clerk endpoint - the list response
    // doesn't reliably carry a total).
    const [res, countRes] = await Promise.all([
      httpFetch(
        `${CLERK_API}/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
        { headers: clerkHeaders() }
      ),
      httpFetch(`${CLERK_API}/users/count`, { headers: clerkHeaders() }),
    ]);
    if (!res.ok) throw new Error(`Clerk list failed: ${res.status}`);
    const users: any[] = await res.json();
    const total = countRes.ok ? Number((await countRes.json())?.total_count ?? 0) : 0;

    const mapped = users.map((u) => {
      const primaryId = u.primary_email_address_id;
      const primary = (u.email_addresses ?? []).find((e: any) => e.id === primaryId)
        ?? (u.email_addresses ?? [])[0];
      return {
        userId: u.id,
        email: primary?.email_address ?? null,
        plan: (u.public_metadata?.plan as string) ?? "free",
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        stats: stats[u.id] ?? null,
      };
    });

    return { users: mapped, total: total || mapped.length, offset, limit };
  },
});

// The lever: set a user's plan in Clerk publicMetadata.
export const setUserPlan = action({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("lifetime")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const res = await httpFetch(`${CLERK_API}/users/${args.userId}/metadata`, {
      method: "PATCH",
      headers: clerkHeaders(),
      body: JSON.stringify({ public_metadata: { plan: args.plan } }),
    });
    if (!res.ok) throw new Error(`Clerk update failed: ${res.status}`);
    return { ok: true };
  },
});
