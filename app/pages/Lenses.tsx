import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Check, Filter, Plus, Target, Trash2, X } from "lucide-react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/cn";
import { useData } from "@/contexts/DataContext";
import { useLens } from "@/contexts/LensContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DUE_LABELS,
  KIND_LABELS,
  STAR_LABELS,
  lensDigit,
  lensPathIds,
  stepInLens,
  type DueFilter,
  type KindFilter,
  type Lens,
  type StarFilter,
} from "@/lib/lens";
import type { Path } from "@/types/index";

/** Paths in tree order with their depth, for an indented checklist. */
function flattenPaths(paths: Path[]): { path: Path; depth: number }[] {
  const ids = new Set(paths.map((p) => p._id));
  const byParent = new Map<string | undefined, Path[]>();
  for (const p of paths) {
    const parent = p.parentId && ids.has(p.parentId) ? p.parentId : undefined;
    byParent.set(parent, [...(byParent.get(parent) ?? []), p]);
  }
  const out: { path: Path; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const p of byParent.get(parent) ?? []) {
      out.push({ path: p, depth });
      walk(p._id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-field p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 type-label transition-colors",
            value === o.value
              ? "bg-accent text-accent-foreground shadow-elev-1"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 type-overline text-muted-foreground">{children}</h3>;
}

/**
 * Adds paths to a lens: a searchable list in a popover, so a long path tree
 * never makes the editor scroll. Arrow keys move, Enter toggles, Esc closes.
 */
function PathPicker({
  tree,
  picked,
  onToggle,
}: {
  tree: { path: Path; depth: number }[];
  picked: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const q = query.trim().toLowerCase();
  // Searching flattens the tree; browsing keeps the indent.
  const rows = q ? tree.filter(({ path }) => path.title.toLowerCase().includes(q)) : tree;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setIndex(0);
        }
      }}
    >
      <Popover.Trigger className="inline-flex items-center gap-1.5 rounded-full bg-field px-3 py-1.5 type-label text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Plus className="h-3.5 w-3.5" />
        Add path
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-lg bg-popover p-1 shadow-elev-3 animate-in fade-in-0 zoom-in-95"
        >
          <input
            autoFocus
            value={query}
            placeholder="Find a path"
            aria-label="Find a path"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && rows[index]) {
                e.preventDefault();
                onToggle(rows[index].path._id);
              }
            }}
            className="mb-1 h-9 w-full rounded-md bg-field px-2 type-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <ul role="listbox" aria-label="Paths" className="max-h-72 overflow-y-auto">
            {rows.length === 0 && (
              <li className="px-2 py-1.5 type-body text-muted-foreground">No matching path</li>
            )}
            {rows.map(({ path, depth }, i) => {
              const on = picked.includes(path._id);
              return (
                <li key={path._id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => onToggle(path._id)}
                    onMouseEnter={() => setIndex(i)}
                    style={{ paddingLeft: `${0.5 + (q ? 0 : depth)}rem` }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left type-body",
                      i === index && "bg-muted"
                    )}
                  >
                    <Target
                      className={cn("h-4 w-4", on ? "text-accent-ink" : "text-muted-foreground")}
                    />
                    <span className="flex-1 truncate">{path.title}</span>
                    {on && <Check className="h-4 w-4 text-accent-ink" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** One line describing a lens, for the list. */
function summarize(lens: Lens, pathTitle: (id: string) => string): string {
  const parts = [
    ...lens.pathIds.map(pathTitle),
    ...lens.due.map((d) => DUE_LABELS[d]),
    lens.kind !== "all" ? KIND_LABELS[lens.kind] : "",
    lens.starred !== "all" ? STAR_LABELS[lens.starred] : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No filters yet";
}

/**
 * Where lenses are made and edited. Every filter is a named lens; switching
 * between them happens in the sidebar, ⌘1 (Everything) to ⌘9, or the command bar.
 */
export default function Lenses() {
  const { activePaths, activeSteps } = useData();
  const { saved, activeId, activate, create, update, remove } = useLens();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleting, setDeleting] = useState<string | null>(null);

  const editId = searchParams.get("edit");
  const selected = saved.find((s) => s.id === editId) ?? saved[0];
  const select = (id: string) => setSearchParams({ edit: id }, { replace: true });

  // "/lenses?new" from the sidebar: make one and open it. Keyed on the
  // navigation, so it works when already on this page and runs once per click
  // (StrictMode runs effects twice in development).
  const location = useLocation();
  const handledNav = useRef<string | null>(null);
  useEffect(() => {
    if (!searchParams.has("new") || handledNav.current === location.key) return;
    handledNav.current = location.key;
    select(create());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location.key]);

  const paths = useMemo(() => activePaths ?? [], [activePaths]);
  const tree = useMemo(() => flattenPaths(paths), [paths]);
  const pathTitle = (id: string) => paths.find((p) => p._id === id)?.title ?? "Path";

  const matchCount = (lens: Lens) => {
    const ids = lensPathIds(lens, paths);
    const now = Date.now();
    return (activeSteps ?? []).filter((s) => stepInLens(s, lens, ids, now)).length;
  };

  const setLens = (patch: Partial<Lens>) =>
    selected && update(selected.id, { lens: { ...selected.lens, ...patch } });
  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="type-page">Lenses</h1>
          <p className="mt-1 type-body text-muted-foreground">
            A lens filters the whole app. Switch in the sidebar, ⌘1 for Everything, ⌘2 to ⌘9 for
            these.
          </p>
        </div>
        <Button onClick={() => select(create())}>
          <Plus className="mr-2 h-4 w-4" />
          New lens
        </Button>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          icon={Filter}
          message="No lenses yet"
          hint="Make one for each context, like Deep work or Spanish"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
          <ul className="space-y-2">
            {saved.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-shadow",
                    s.id === selected?.id
                      ? "bg-card shadow-elev-2"
                      : "hover:bg-card hover:shadow-elev-1"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate font-medium">{s.name}</span>
                    {s.id === activeId && (
                      <span className="rounded-full bg-accent px-2 py-0.5 type-meta text-accent-foreground">
                        In use
                      </span>
                    )}
                    {lensDigit(i) && (
                      <kbd className="rounded bg-field px-1.5 type-kbd text-muted-foreground">
                        ⌘{lensDigit(i)}
                      </kbd>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate type-meta text-muted-foreground">
                    {summarize(s.lens, pathTitle)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            // min-w-0: a grid item will not shrink below its content otherwise.
            <Card className="min-w-0">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Lens name"
                    value={selected.name}
                    onChange={(e) => update(selected.id, { name: e.target.value })}
                    className="h-10 min-w-0 flex-1 rounded-md bg-field px-3 type-section focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {selected.id === activeId ? (
                    <Button variant="outline" onClick={() => activate(null)}>
                      <Check className="mr-2 h-4 w-4" />
                      In use, stop
                    </Button>
                  ) : (
                    <Button onClick={() => activate(selected.id)}>Use this lens</Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete lens"
                    title="Delete lens"
                    onClick={() => setDeleting(selected.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <p className="type-body text-muted-foreground">
                  {matchCount(selected.lens)} open steps match
                </p>

                {/* One compact row per filter, label left, so the whole lens
                    fits without scrolling. */}
                <div className="grid grid-cols-[5.5rem_1fr] items-start gap-x-4 gap-y-5">
                  <FilterLabel>Paths</FilterLabel>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      {selected.lens.pathIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent-light py-1.5 pl-3 pr-1.5 type-label text-accent-ink"
                        >
                          <Target className="h-3.5 w-3.5" />
                          {pathTitle(id)}
                          <button
                            type="button"
                            aria-label={`Remove ${pathTitle(id)}`}
                            onClick={() =>
                              setLens({ pathIds: selected.lens.pathIds.filter((x) => x !== id) })
                            }
                            className="rounded-full p-0.5 hover:bg-accent/15"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                      <PathPicker
                        tree={tree}
                        picked={selected.lens.pathIds}
                        onToggle={(id) => setLens({ pathIds: toggle(selected.lens.pathIds, id) })}
                      />
                    </div>
                    <p className="type-meta text-muted-foreground">
                      Includes sub-paths. None picked means every path.
                    </p>
                  </div>

                  <FilterLabel>Due</FilterLabel>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(DUE_LABELS) as DueFilter[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={selected.lens.due.includes(d)}
                        onClick={() => setLens({ due: toggle(selected.lens.due, d) })}
                        className={cn(
                          "rounded-full px-3 py-1.5 type-label transition-colors",
                          selected.lens.due.includes(d)
                            ? "bg-accent text-accent-foreground"
                            : "bg-field text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {DUE_LABELS[d]}
                      </button>
                    ))}
                  </div>

                  <FilterLabel>Kind</FilterLabel>
                  <Segmented<KindFilter>
                    value={selected.lens.kind}
                    onChange={(kind) => setLens({ kind })}
                    options={[
                      { value: "all", label: "All" },
                      { value: "oneoff", label: "One-off" },
                      { value: "routine", label: "From routines" },
                    ]}
                  />

                  <FilterLabel>Starred</FilterLabel>
                  <Segmented<StarFilter>
                    value={selected.lens.starred}
                    onChange={(starred) => setLens({ starred })}
                    options={[
                      { value: "all", label: "All" },
                      { value: "starred", label: "Starred" },
                      { value: "unstarred", label: "Not starred" },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this lens?"
        description="Only the lens goes. Your steps and paths are not touched."
        confirmLabel="Delete lens"
        onConfirm={() => {
          if (deleting) remove(deleting);
          setSearchParams({}, { replace: true });
        }}
      />
    </div>
  );
}
