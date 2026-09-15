import GraphView from "@/components/graph/GraphView";
import { PathDeleteDialog } from "@/components/PathDeleteDialog";
import QuickCapture from "@/components/QuickCapture";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import { formatKeybindDisplay, getKeybinds } from "@/lib/keybind-config";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  useArchivePath,
  useDeletePathWithMigration,
  useUnarchivePath,
  useUpdatePath,
} from "@/lib/local-mutations";
import type { Path, Step } from "@/types/index";
import {
  Archive,
  ArchiveRestore,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ─── Main Paths Page ─────────────────────────────────────────────────

export default function Paths() {
  const toast = useToast();
  const { activePaths, archivedPaths, allSteps } = useData();

  const updatePathMutation = useUpdatePath();
  const archivePathMutation = useArchivePath();
  const unarchivePathMutation = useUnarchivePath();
  const deletePathWithMigrationMutation = useDeletePathWithMigration();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathForm, setEditPathForm] = useState({ title: "", description: "" });
  // Derived, not raw state. Unarchiving the last path empties this view while
  // the toggle that got you here is conditional on something being archived,
  // so a raw flag strands you on "No archived paths" with no way back except a
  // reload. Reading the flag through the count means the view cannot outlive
  // the control that leaves it.
  const [archivedRequested, setShowArchived] = useState(false);
  const showArchived = archivedRequested && (archivedPaths?.length ?? 0) > 0;
  const [deleteDialogPath, setDeleteDialogPath] = useState<Path | null>(null);
  const [showList, setShowList] = useState<boolean>(() => {
    try {
      return localStorage.getItem("voidsteps-paths-list") !== "closed";
    } catch {
      return true;
    }
  });
  const toggleList = () =>
    setShowList((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("voidsteps-paths-list", next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });

  const sourcePaths = showArchived ? archivedPaths : activePaths;

  const { flattenedPaths, childMap } = useMemo(() => {
    if (!sourcePaths) return { flattenedPaths: [], childMap: new Map() };
    const childMap = new Map<string | null, Path[]>();
    sourcePaths.forEach((path) => {
      const parentId = path.parentId || null;
      const effectiveParentId = sourcePaths.some((p) => p._id === parentId) ? parentId : null;
      if (!childMap.has(effectiveParentId)) childMap.set(effectiveParentId, []);
      childMap.get(effectiveParentId)!.push(path);
    });
    const result: { path: Path; depth: number }[] = [];
    const addPathWithChildren = (path: Path, depth: number) => {
      result.push({ path, depth });
      (childMap.get(path._id) || []).forEach((child) => addPathWithChildren(child, depth + 1));
    };
    (childMap.get(null) || []).forEach((path) => addPathWithChildren(path, 0));
    return { flattenedPaths: result, childMap };
  }, [sourcePaths]);

  const updatePath = async (id: string, title: string, description: string) => {
    try {
      await updatePathMutation({ id, title, description: description || undefined });
      setEditingPath(null);
    } catch (error) {
      reportError("mutation", error, { action: "updatePath", pathId: id });
      toast.error("Failed to update path");
    }
  };

  // Nesting is done by dragging a path node onto another in the graph.
  const handleReparent = useCallback(
    async (childId: string, parentId: string | null) => {
      try {
        await updatePathMutation({ id: childId, parentId });
        const child = activePaths?.find((p) => p._id === childId);
        const parent = parentId ? activePaths?.find((p) => p._id === parentId) : null;
        toast.success(
          parent
            ? `Nested "${child?.title}" under "${parent.title}"`
            : `Made "${child?.title}" a top-level path`
        );
      } catch (error) {
        reportError("mutation", error, { action: "reparentPath", pathId: childId });
        toast.error("Couldn't move that path (would create a loop?)");
      }
    },
    [updatePathMutation, activePaths, toast]
  );

  const startEditPath = (path: Path) => {
    setEditingPath(path._id);
    setEditPathForm({ title: path.title, description: path.description || "" });
  };
  const cancelEditPath = () => {
    setEditingPath(null);
    setEditPathForm({ title: "", description: "" });
  };

  const handleArchive = async (id: string) => {
    try {
      await archivePathMutation({ id });
    } catch (error) {
      reportError("mutation", error, { action: "archivePath", pathId: id });
      toast.error("Failed to archive path");
    }
  };
  const handleUnarchive = async (id: string) => {
    try {
      await unarchivePathMutation({ id });
    } catch (error) {
      reportError("mutation", error, { action: "unarchivePath", pathId: id });
      toast.error("Failed to unarchive path");
    }
  };
  const handleDeleteConfirm = async (destinationPathId: string | null) => {
    if (!deleteDialogPath) return;
    try {
      await deletePathWithMigrationMutation({ id: deleteDialogPath._id, destinationPathId });
    } catch (error) {
      reportError("mutation", error, { action: "deletePath", pathId: deleteDialogPath._id });
      toast.error("Failed to delete path");
    }
    setDeleteDialogPath(null);
  };

  const getPathStats = (pathId: string) => {
    if (!allSteps) return { total: 0, completed: 0, failed: 0, incomplete: 0 };
    const pathSteps = allSteps.filter((step: Step) => {
      const sid = step.path?._id || (typeof step.pathId === "string" ? step.pathId : null);
      return sid === pathId;
    });
    return {
      total: pathSteps.length,
      completed: pathSteps.filter((s: Step) => s.completed).length,
      failed: pathSteps.filter((s: Step) => s.failed === true).length,
      incomplete: pathSteps.filter((s: Step) => !s.completed && s.failed !== true).length,
    };
  };

  const getStepsInPath = (pathId: string): Step[] => {
    if (!allSteps) return [];
    return allSteps.filter((step: Step) => {
      const sid = step.path?._id || (typeof step.pathId === "string" ? step.pathId : null);
      return sid === pathId;
    });
  };
  const getChildPaths = (pathId: string): Path[] => childMap.get(pathId) || [];
  const getChildPathsCount = (pathId: string) => (childMap.get(pathId) || []).length;

  const archivedCount = archivedPaths?.length ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Paths</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={toggleList}
            title={showList ? "Hide paths list" : "Show paths list"}
          >
            {showList ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Path
            <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 font-mono text-[10px]">
              {formatKeybindDisplay(getKeybinds().quickCreatePath)}
            </kbd>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
        {/* Graph canvas - primary view. Top half on mobile, left on desktop. */}
        <div className="flex-1 min-h-0 min-w-0">
          <GraphView
            paths={activePaths || []}
            allSteps={allSteps || []}
            sidebarOpen={showList}
            onReparent={handleReparent}
          />
        </div>

        {/* Paths list - bottom on mobile, right side on desktop. */}
        {showList && (
          <aside className="w-full flex-1 min-h-0 md:w-80 md:flex-none flex flex-col border-t border-border pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {showArchived ? "Archived Paths" : "All paths"}
              </h2>
              {archivedCount > 0 && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {flattenedPaths.length > 0 ? (
                flattenedPaths.map(({ path, depth }) => {
                  const stats = getPathStats(path._id);
                  const childCount = getChildPathsCount(path._id);
                  const isArchived = showArchived;
                  const isEditing = editingPath === path._id;
                  return (
                    <div
                      key={path._id}
                      className={`rounded-lg border p-3 transition-colors ${isArchived ? "opacity-60 border-border" : "border-border hover:border-primary/50"}`}
                      style={{ marginLeft: `${depth * 12}px` }}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Path title"
                            value={editPathForm.title}
                            onChange={(e) =>
                              setEditPathForm({ ...editPathForm, title: e.target.value })
                            }
                            maxLength={MAX_TITLE_LENGTH}
                            className="h-9 text-sm"
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={editPathForm.description}
                            onChange={(e) =>
                              setEditPathForm({ ...editPathForm, description: e.target.value })
                            }
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            className="h-9 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                updatePath(path._id, editPathForm.title, editPathForm.description)
                              }
                              disabled={!editPathForm.title.trim()}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditPath}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-sm truncate">{path.title}</h3>
                                {isArchived && (
                                  <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                    Archived
                                  </span>
                                )}
                              </div>
                              {path.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {path.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isArchived ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnarchive(path._id)}
                                  className="h-6 w-6 p-0"
                                  title="Unarchive"
                                >
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditPath(path)}
                                    className="h-6 w-6 p-0"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleArchive(path._id)}
                                    className="h-6 w-6 p-0"
                                    title="Archive"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteDialogPath(path)}
                                    className="h-6 w-6 p-0"
                                    title="Delete"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px] text-muted-foreground">
                            <span>{stats.completed} done</span>
                            <span>•</span>
                            <span className="text-destructive">{stats.failed} failed</span>
                            <span>•</span>
                            <span>{stats.incomplete} active</span>
                            {childCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{childCount} sub</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground text-center py-8">
                  {showArchived ? "No archived paths" : "No paths yet. Create one above."}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {deleteDialogPath && (
        <PathDeleteDialog
          open={!!deleteDialogPath}
          onOpenChange={(open) => {
            if (!open) setDeleteDialogPath(null);
          }}
          path={deleteDialogPath}
          stepsInPath={getStepsInPath(deleteDialogPath._id)}
          childPaths={getChildPaths(deleteDialogPath._id)}
          allPaths={activePaths || []}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <QuickCapture kind="path" open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
