import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Step, Path } from "@/types/index";
import {
  useUpdatePath,
  useArchivePath,
  useUnarchivePath,
  useDeletePathWithMigration,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Plus,
  X,
  Pencil,
  Archive,
  ArchiveRestore,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { PathDeleteDialog } from "@/components/PathDeleteDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import QuickCreatePathDialog from "@/components/QuickCreatePathDialog";
import { getKeybinds, formatKeybindDisplay } from "@/lib/keybind-config";

// Graph imports
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import UserNode from '@/components/graph/UserNode';
import PathNode from '@/components/graph/PathNode';
import StepNode from '@/components/graph/StepNode';
import FloatingEdge from '@/components/graph/FloatingEdge';

// ─── Graph utilities (from Pathway.tsx) ──────────────────────────────

type ViewportType = { x: number; y: number; zoom: number };

const VIEWPORT_STORAGE_KEY = 'viz-viewport-v1';
const NODES_STORAGE_KEY = 'viz-nodes-v1';

const saveViewport = (viewport: ViewportType) => {
  try { localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport)); } catch {}
};
const loadViewport = (): ViewportType | null => {
  try { const s = localStorage.getItem(VIEWPORT_STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};
const saveNodePositions = (nodes: Node[]) => {
  try {
    const positions = nodes.reduce((acc, node) => { acc[node.id] = node.position; return acc; }, {} as Record<string, { x: number; y: number }>);
    localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(positions));
  } catch {}
};
const loadNodePositions = (): Record<string, { x: number; y: number }> | null => {
  try { const s = localStorage.getItem(NODES_STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};

const nodeTypes = { userNode: UserNode, pathNode: PathNode, stepNode: StepNode };
const edgeTypes = { floating: FloatingEdge };

// Approx node footprint for collision avoidance when auto-placing new nodes.
const NODE_W = 240;
const NODE_H = 120;
const GAP = 28;

type Pt = { x: number; y: number };
const overlaps = (p: Pt, taken: Pt[]) =>
  taken.some((o) => Math.abs(p.x - o.x) < NODE_W && Math.abs(p.y - o.y) < NODE_H);

// Find the closest free spot to `base`: try the slot, then shift left/right in
// widening steps, dropping to a new row if a whole row is blocked.
const findFreeSpot = (base: Pt, taken: Pt[]): Pt => {
  if (!overlaps(base, taken)) return base;
  for (let row = 0; row < 8; row++) {
    const y = base.y + row * (NODE_H + GAP);
    if (row > 0 && !overlaps({ x: base.x, y }, taken)) return { x: base.x, y };
    for (let i = 1; i <= 10; i++) {
      const dx = Math.ceil(i / 2) * (NODE_W + GAP) * (i % 2 === 0 ? -1 : 1);
      const cand = { x: base.x + dx, y };
      if (!overlaps(cand, taken)) return cand;
    }
  }
  return base;
};

const buildNodesFromData = (paths: any[], steps: any[], savedPositions: Record<string, { x: number; y: number }> | null) => {
  const nodes: Node[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  const rootPaths = paths.filter(p => !p.parentId);
  const childPaths = paths.filter(p => p.parentId);

  const youPosition = savedPositions?.['you'] || { x: 400, y: 50 };
  positions['you'] = youPosition;
  nodes.push({ id: 'you', type: 'userNode', position: youPosition, data: { label: 'Me' } });

  const spacing = 250;
  rootPaths.forEach((path, index) => {
    const pathSteps = steps.filter((s: any) => s.pathId === path._id);
    // New (unsaved) root paths drop centered below "Me", nudged to avoid overlap.
    const position = savedPositions?.[path._id]
      ?? findFreeSpot(
        { x: youPosition.x + (index - (rootPaths.length - 1) / 2) * spacing, y: youPosition.y + 180 },
        Object.values(positions),
      );
    positions[path._id] = position;
    nodes.push({ id: path._id, type: 'pathNode', position, data: {
      label: path.title, description: path.description,
      completedCount: pathSteps.filter((s: any) => s.completed).length,
      failedCount: pathSteps.filter((s: any) => s.failed).length,
      inProgressCount: pathSteps.filter((s: any) => !s.completed && !s.failed).length,
      isRoot: true,
    }});
  });

  const childMap = new Map<string, any[]>();
  childPaths.forEach(path => { if (!childMap.has(path.parentId)) childMap.set(path.parentId, []); childMap.get(path.parentId)!.push(path); });

  let currentLevel = rootPaths.map(p => p._id);
  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    currentLevel.forEach(parentId => {
      const siblings = childMap.get(parentId) || [];
      const parentPos = positions[parentId] || { x: 400, y: 200 };
      siblings.forEach((path, sibIdx) => {
        const pathSteps = steps.filter((s: any) => s.pathId === path._id);
        // New (unsaved) child paths drop centered below their parent, nudged to avoid overlap.
        const position = savedPositions?.[path._id]
          ?? findFreeSpot(
            { x: parentPos.x + (sibIdx - (siblings.length - 1) / 2) * 220, y: parentPos.y + 180 },
            Object.values(positions),
          );
        positions[path._id] = position;
        nodes.push({ id: path._id, type: 'pathNode', position, data: {
          label: path.title, description: path.description,
          completedCount: pathSteps.filter((s: any) => s.completed).length,
          failedCount: pathSteps.filter((s: any) => s.failed).length,
          inProgressCount: pathSteps.filter((s: any) => !s.completed && !s.failed).length,
          isRoot: false,
        }});
        nextLevel.push(path._id);
      });
    });
    currentLevel = nextLevel;
  }
  return { nodes, positions };
};

// Floating edges - geometry is computed live in FloatingEdge from node
// positions, so we only declare the relationships here.
const buildEdgesFromData = (paths: any[]): Edge[] => {
  const edges: Edge[] = [];
  const createEdge = (sourceId: string, targetId: string) => {
    edges.push({
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'floating',
    });
  };

  paths.filter(p => !p.parentId).forEach(path => createEdge('you', path._id));
  paths.filter(p => p.parentId).forEach(path => createEdge(path.parentId, path._id));

  return edges;
};

// ─── Graph Tab Component ─────────────────────────────────────────────

function GraphView({ paths, allSteps, sidebarOpen }: { paths: Path[]; allSteps: Step[]; sidebarOpen: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfRef = useRef<any>(null);
  const firstFit = useRef(true);

  // Recenter when the canvas width changes (sidebar collapse/expand).
  useEffect(() => {
    if (firstFit.current) { firstFit.current = false; return; }
    const t = setTimeout(() => rfRef.current?.fitView({ padding: 0.2, duration: 300 }), 60);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  const savedPositions = useMemo(() => loadNodePositions(), []);
  const initialData = useMemo(() => {
    if (!paths.length) return { nodes: [], edges: [] };
    const { nodes } = buildNodesFromData(paths, allSteps, savedPositions);
    return { nodes, edges: buildEdgesFromData(paths) };
  }, [paths, allSteps, savedPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  useEffect(() => {
    if (paths.length) {
      const { nodes: n } = buildNodesFromData(paths, allSteps, loadNodePositions());
      setNodes(n);
      setEdges(buildEdgesFromData(paths));
    }
  }, [paths, allSteps, setNodes, setEdges]);

  // Floating edges follow node positions live, so we just persist on drop.
  const handleNodeDragStop = useCallback(() => {
    saveNodePositions(nodes);
  }, [nodes]);

  const savedViewport = loadViewport();
  const defaultViewport = savedViewport || { x: 0, y: 0, zoom: 1 };
  const saveViewportTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleMove = useCallback((viewport: ViewportType) => {
    if (saveViewportTimer.current) clearTimeout(saveViewportTimer.current);
    saveViewportTimer.current = setTimeout(() => saveViewport(viewport), 500);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => saveNodePositions(nodes), 1000);
    return () => clearTimeout(timer);
  }, [nodes]);

  if (!paths.length) {
    return (
      <div className="h-full border border-border rounded-lg overflow-hidden bg-background flex items-center justify-center">
        <EmptyState icon={GitBranch} message="No paths to visualize" hint="Create a path from the sidebar to see your graph" />
      </div>
    );
  }

  return (
    <div className="h-full border border-border rounded-lg overflow-hidden bg-background" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onInit={(inst) => { rfRef.current = inst; }}
        onNodeDragStop={handleNodeDragStop} nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultViewport={defaultViewport}
        onMove={(_e, v) => handleMove(v)} fitView={!savedViewport} minZoom={0.1} maxZoom={2}
        nodesDraggable panOnDrag panOnScroll={false} zoomOnScroll selectionOnDrag={false}
        // Edges mirror path relationships - never user-editable. Lock all
        // connect/reconnect/delete interactions so dragging can't unlink nodes.
        nodesConnectable={false} edgesUpdatable={false} edgesFocusable={false}
        elementsSelectable={false} deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'floating', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}

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
  const [editPathForm, setEditPathForm] = useState({ title: "", description: "", parentId: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogPath, setDeleteDialogPath] = useState<Path | null>(null);
  const [showList, setShowList] = useState<boolean>(() => {
    try { return localStorage.getItem('voidsteps-paths-list') !== 'closed'; } catch { return true; }
  });
  const toggleList = () => setShowList((prev) => {
    const next = !prev;
    try { localStorage.setItem('voidsteps-paths-list', next ? 'open' : 'closed'); } catch { /* ignore */ }
    return next;
  });

  const sourcePaths = showArchived ? archivedPaths : activePaths;

  const { flattenedPaths, childMap } = useMemo(() => {
    if (!sourcePaths) return { flattenedPaths: [], childMap: new Map() };
    const childMap = new Map<string | null, Path[]>();
    sourcePaths.forEach((path) => {
      const parentId = path.parentId || null;
      const effectiveParentId = sourcePaths.some(p => p._id === parentId) ? parentId : null;
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


  const updatePath = async (id: string, title: string, description: string, parentId: string) => {
    try { await updatePathMutation({ id, title, description: description || undefined, parentId: parentId || null }); setEditingPath(null); }
    catch (error) { reportError('mutation', error, { action: 'updatePath', pathId: id }); toast.error("Failed to update path"); }
  };

  const startEditPath = (path: Path) => { setEditingPath(path._id); setEditPathForm({ title: path.title, description: path.description || "", parentId: path.parentId || "" }); };
  const cancelEditPath = () => { setEditingPath(null); setEditPathForm({ title: "", description: "", parentId: "" }); };

  const handleArchive = async (id: string) => {
    try { await archivePathMutation({ id }); } catch (error) { reportError('mutation', error, { action: 'archivePath', pathId: id }); toast.error("Failed to archive path"); }
  };
  const handleUnarchive = async (id: string) => {
    try { await unarchivePathMutation({ id }); } catch (error) { reportError('mutation', error, { action: 'unarchivePath', pathId: id }); toast.error("Failed to unarchive path"); }
  };
  const handleDeleteConfirm = async (destinationPathId: string | null) => {
    if (!deleteDialogPath) return;
    try { await deletePathWithMigrationMutation({ id: deleteDialogPath._id, destinationPathId }); }
    catch (error) { reportError('mutation', error, { action: 'deletePath', pathId: deleteDialogPath._id }); toast.error("Failed to delete path"); }
    setDeleteDialogPath(null);
  };

  const getPathStats = (pathId: string) => {
    if (!allSteps) return { total: 0, completed: 0, failed: 0, incomplete: 0 };
    const pathSteps = allSteps.filter((step: Step) => { const sid = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null); return sid === pathId; });
    return { total: pathSteps.length, completed: pathSteps.filter((s: Step) => s.completed).length, failed: pathSteps.filter((s: Step) => s.failed === true).length, incomplete: pathSteps.filter((s: Step) => !s.completed && s.failed !== true).length };
  };

  const getStepsInPath = (pathId: string): Step[] => {
    if (!allSteps) return [];
    return allSteps.filter((step: Step) => { const sid = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null); return sid === pathId; });
  };
  const getChildPaths = (pathId: string): Path[] => childMap.get(pathId) || [];
  const getChildPathsCount = (pathId: string) => (childMap.get(pathId) || []).length;

  const getParentOptions = (excludeId?: string) => {
    if (!excludeId) return flattenedPaths;
    const excludeIds = new Set<string>([excludeId]);
    const addDescendants = (id: string) => { (childMap.get(id) || []).forEach((child: Path) => { excludeIds.add(child._id); addDescendants(child._id); }); };
    addDescendants(excludeId);
    return flattenedPaths.filter((item) => !excludeIds.has(item.path._id));
  };

  const archivedCount = archivedPaths?.length ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Paths</h1>
        <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={toggleList} title={showList ? "Hide paths list" : "Show paths list"}>
          {showList ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
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
          <GraphView paths={activePaths || []} allSteps={allSteps || []} sidebarOpen={showList} />
        </div>

        {/* Paths list - bottom on mobile, right side on desktop. */}
        {showList && (
        <aside className="w-full flex-1 min-h-0 md:w-80 md:flex-none flex flex-col border-t border-border pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {showArchived ? "Archived Paths" : "All Paths"}
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
                        <Input placeholder="Path title" value={editPathForm.title} onChange={(e) => setEditPathForm({ ...editPathForm, title: e.target.value })} maxLength={MAX_TITLE_LENGTH} className="h-9 text-sm" />
                        <Input placeholder="Description (optional)" value={editPathForm.description} onChange={(e) => setEditPathForm({ ...editPathForm, description: e.target.value })} maxLength={MAX_DESCRIPTION_LENGTH} className="h-9 text-sm" />
                        <Select
                          triggerClassName="h-9"
                          value={editPathForm.parentId}
                          onValueChange={(v) => setEditPathForm({ ...editPathForm, parentId: v })}
                          placeholder="Root (no parent)"
                          options={[
                            { value: "", label: "Root (no parent)" },
                            ...getParentOptions(path._id).map(({ path: p, depth: d }) => ({
                              value: p._id,
                              label: `${d > 0 ? "└ " : ""}${p.title}`,
                            })),
                          ]}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updatePath(path._id, editPathForm.title, editPathForm.description, editPathForm.parentId)} disabled={!editPathForm.title.trim()}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEditPath}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-medium text-sm truncate">{path.title}</h3>
                              {isArchived && <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>}
                            </div>
                            {path.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{path.description}</p>}
                          </div>
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isArchived ? (
                              <Button variant="ghost" size="sm" onClick={() => handleUnarchive(path._id)} className="h-6 w-6 p-0" title="Unarchive"><ArchiveRestore className="w-3.5 h-3.5" /></Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => startEditPath(path)} className="h-6 w-6 p-0" title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleArchive(path._id)} className="h-6 w-6 p-0" title="Archive"><Archive className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteDialogPath(path)} className="h-6 w-6 p-0" title="Delete"><X className="w-3.5 h-3.5" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px] text-muted-foreground">
                          <span>{stats.completed} done</span><span>•</span>
                          <span className="text-destructive">{stats.failed} failed</span><span>•</span>
                          <span>{stats.incomplete} active</span>
                          {childCount > 0 && <><span>•</span><span>{childCount} sub</span></>}
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
          onOpenChange={(open) => { if (!open) setDeleteDialogPath(null); }}
          path={deleteDialogPath}
          stepsInPath={getStepsInPath(deleteDialogPath._id)}
          childPaths={getChildPaths(deleteDialogPath._id)}
          allPaths={activePaths || []}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <QuickCreatePathDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
