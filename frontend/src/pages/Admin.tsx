// Superadmin dashboard. INTENTIONALLY ISOLATED: imports only ui/ primitives,
// convex/react, clerk, and pure utils - never sync-engine / db / OfflineContext.
// That dependency hygiene is what lets this page be lifted into a standalone
// admin app later (point a new Vite shell at the same Convex) without a rewrite.
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatRelativePast } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import LoadingScreen from "@/components/LoadingScreen";
import { useToast } from "@/contexts/ToastContext";
import { Users, MessageSquare, RefreshCw, Inbox, ArrowLeft } from "lucide-react";

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "lifetime", label: "Lifetime" },
];
const TYPE_VARIANT: Record<string, "info" | "destructive" | "secondary"> = {
  general: "info",
  bug: "destructive",
  feature: "secondary",
};

type AdminUser = {
  userId: string;
  email: string | null;
  plan: string;
  createdAt: number | null;
  lastSignInAt: number | null;
  stats: {
    paths: number; steps: number; completed: number; active: number; completed7d: number;
    routines: number; notes: number; reminders: number;
    lastActive: number; joined: number;
  } | null;
};

const PAGE_SIZE = 50;

function UsageCell({ stats }: { stats: AdminUser["stats"] }) {
  if (!stats || stats.steps + stats.paths + stats.notes === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  const pct = stats.steps > 0 ? Math.round((stats.completed / stats.steps) * 100) : 0;
  return (
    <div className="leading-tight">
      <div className="text-foreground">
        {stats.steps} steps · {pct}% done · <span className="text-primary">{stats.completed7d} this wk</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {stats.active} active · {stats.paths} paths · {stats.routines} routines · {stats.notes} notes
      </div>
    </div>
  );
}

function UsersTab() {
  const toast = useToast();
  const listUsers = useAction(api.admin.listUsers);
  const setUserPlan = useAction(api.admin.setUserPlan);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    setUsers(null);
    listUsers({ limit: PAGE_SIZE, offset })
      .then((res) => { setUsers(res.users as AdminUser[]); setTotal(res.total); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"));
  }, [listUsers, offset]);

  useEffect(() => { refresh(); }, [refresh]);

  const changePlan = async (userId: string, plan: string) => {
    setSavingId(userId);
    // Optimistic: reflect immediately, revert on failure.
    setUsers((prev) => prev?.map((u) => (u.userId === userId ? { ...u, plan } : u)) ?? prev);
    try {
      await setUserPlan({ userId, plan: plan as "free" | "pro" | "lifetime" });
      toast.success(`Plan set to ${plan}`);
    } catch {
      toast.error("Couldn't update plan");
      refresh();
    } finally {
      setSavingId(null);
    }
  };

  if (error) {
    return <EmptyState icon={Users} message="Couldn't load users" hint={error} />;
  }
  if (!users) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading users…</p>;
  }
  if (users.length === 0 && offset === 0) {
    return <EmptyState icon={Users} message="No users yet" />;
  }

  const from = offset + 1;
  const to = offset + users.length;
  const hasPrev = offset > 0;
  const hasNext = to < total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{from}-{to} of {total}</p>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>
      {/* No overflow wrapper: the plan <Select> renders an absolute dropdown that
          an overflow-x container would clip. */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-medium">User</th>
            <th className="py-2 pr-4 font-medium">Plan</th>
            <th className="py-2 pr-4 font-medium">Usage</th>
            <th className="py-2 pr-4 font-medium">Last active</th>
            <th className="py-2 pr-4 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId} className="border-b border-border/50">
              <td className="py-2 pr-4">
                <span className="font-medium">{u.email ?? u.userId}</span>
                {!u.stats && (
                  <Badge variant="outline" size="sm" className="ml-2">never synced</Badge>
                )}
              </td>
              <td className="py-2 pr-4">
                <Select
                  value={u.plan}
                  onValueChange={(v) => changePlan(u.userId, v)}
                  options={PLAN_OPTIONS}
                  disabled={savingId === u.userId}
                  triggerClassName="w-32"
                />
              </td>
              <td className="py-2 pr-4">
                <UsageCell stats={u.stats} />
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {u.lastSignInAt ? formatRelativePast(u.lastSignInAt) : "-"}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {u.createdAt ? formatRelativePast(u.createdAt) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={!hasPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

type FeedbackRow = {
  _id: string;
  userId: string;
  email?: string | null;
  type: "general" | "bug" | "feature";
  message: string;
  status: "open" | "resolved";
  adminReply?: string;
  repliedAt?: number;
  diagnostics?: unknown;
  createdAt: number;
};

function FeedbackCard({ f, onOpenUser }: { f: FeedbackRow; onOpenUser: (u: { userId: string; email: string | null }) => void }) {
  const setStatus = useMutation(api.feedback.setFeedbackStatus);
  const [reply, setReply] = useState(f.adminReply ?? "");
  const [busy, setBusy] = useState(false);

  const act = async (status: "open" | "resolved") => {
    setBusy(true);
    try {
      // Always send the (trimmed) reply string so emptying it clears the reply;
      // the server treats "" as "clear" and only omitting the arg as "unchanged".
      await setStatus({ id: f._id as any, status, reply: reply.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={TYPE_VARIANT[f.type] ?? "secondary"} size="sm">{f.type}</Badge>
            <button
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onOpenUser({ userId: f.userId, email: f.email ?? null })}
            >
              {f.email ?? f.userId}
            </button>
            <span className="text-xs text-muted-foreground">· {formatRelativePast(f.createdAt)}</span>
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap">{f.message}</p>
        {!!f.diagnostics && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Diagnostics</summary>
            <pre className="mt-1 overflow-x-auto rounded bg-muted p-2">
              {JSON.stringify(f.diagnostics, null, 2)}
            </pre>
          </details>
        )}

        <div className="space-y-2 pt-1">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to this user (optional)…"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            {f.status === "open" ? (
              <Button size="sm" disabled={busy} onClick={() => act("resolved")}>
                {reply.trim() ? "Reply & resolve" : "Resolve"}
              </Button>
            ) : (
              <>
                {reply.trim() !== (f.adminReply ?? "") && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act("resolved")}>
                    Save reply
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("open")}>
                  Reopen
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserThread({ user, onBack }: { user: { userId: string; email: string | null }; onBack: () => void }) {
  const items = useQuery(api.feedback.userFeedback, { userId: user.userId }) as FeedbackRow[] | undefined;
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>
      <h2 className="text-lg font-semibold">{user.email ?? user.userId}</h2>
      {!items ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} message="No feedback from this user" />
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <Card key={f._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_VARIANT[f.type] ?? "secondary"} size="sm">{f.type}</Badge>
                  <Badge variant={f.status === "open" ? "warning" : "success"} size="sm">{f.status}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativePast(f.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                {f.adminReply && (
                  <div className="rounded-md bg-muted p-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Your reply:</span>
                    <p className="whitespace-pre-wrap">{f.adminReply}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackTab() {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [selectedUser, setSelectedUser] = useState<{ userId: string; email: string | null } | null>(null);
  const feedback = useQuery(
    api.feedback.listFeedback,
    selectedUser ? "skip" : { status: filter }
  ) as FeedbackRow[] | undefined;

  if (selectedUser) {
    return <UserThread user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="space-y-3">
      <Tabs defaultValue="open" value={filter} onValueChange={(v) => setFilter(v as "open" | "resolved")}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {!feedback ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : feedback.length === 0 ? (
        <EmptyState icon={Inbox} message={`No ${filter} feedback`} />
      ) : (
        <div className="space-y-2">
          {feedback.map((f) => (
            <FeedbackCard key={f._id} f={f} onOpenUser={setSelectedUser} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  // Single source of truth: the server decides via SUPERADMIN_EMAILS. undefined
  // = still loading; false = not an admin → redirect.
  const isAdmin = useQuery(api.admin.amISuperAdmin, {});
  if (isAdmin === undefined) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plans, usage, and feedback. Usage reflects syncing users only.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="w-4 h-4 mr-1.5" /> Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab /></TabsContent>
      </Tabs>
    </div>
  );
}
