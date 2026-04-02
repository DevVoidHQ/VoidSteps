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
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Plus,
  X,
  Target,
  Pencil,
  ChevronRight,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Hand,
  Edit3,
  GitBranch,
} from "lucide-react";
import { PathDeleteDialog } from "@/components/PathDeleteDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import QuickCreatePathDialog from "@/components/QuickCreatePathDialog";
import { getKeybinds, formatKeybindDisplay } from "@/lib/keybind-config";

// Graph imports
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import UserNode from '@/components/graph/UserNode';
import PathNode from '@/components/graph/PathNode';
import StepNode from '@/components/graph/StepNode';

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
const clearSavedState = () => { localStorage.removeItem(VIEWPORT_STORAGE_KEY); localStorage.removeItem(NODES_STORAGE_KEY); };

const nodeTypes = { userNode: UserNode, pathNode: PathNode, stepNode: StepNode };

const buildNodesFromData = (paths: any[], steps: any[], savedPositions: Record<string, { x: number; y: number }> | null) => {
  const nodes: Node[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  const rootPaths = paths.filter(p => !p.parentId);
  const childPaths = paths.filter(p => p.parentId);

  const youPosition = savedPositions?.['you'] || { x: 400, y: 50 };
  positions['you'] = youPosition;
  nodes.push({ id: 'you', type: 'userNode', position: youPosition, data: { label: 'Me' } });

  const spacing = 250;
  const startX = 400 - (rootPaths.length * spacing) / 2;
  rootPaths.forEach((path, index) => {
    const pathSteps = steps.filter((s: any) => s.pathId === path._id);
    const position = savedPositions?.[path._id] || { x: startX + index * spacing, y: 200 };
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
  let yOffset = 350;
  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    let xIndex = 0;
    currentLevel.forEach(parentId => {
      (childMap.get(parentId) || []).forEach(path => {
        const pathSteps = steps.filter((s: any) => s.pathId === path._id);
        const position = savedPositions?.[path._id] || { x: 100 + xIndex * 200, y: yOffset };
        positions[path._id] = position;
        nodes.push({ id: path._id, type: 'pathNode', position, data: {
          label: path.title, description: path.description,
          completedCount: pathSteps.filter((s: any) => s.completed).length,
          failedCount: pathSteps.filter((s: any) => s.failed).length,
          inProgressCount: pathSteps.filter((s: any) => !s.completed && !s.failed).length,
          isRoot: false,
        }});
        nextLevel.push(path._id);
        xIndex++;
      });
    });
    currentLevel = nextLevel;
    yOffset += 150;
  }
  return { nodes, positions };
};

interface NodeHandles { hasTopIn: boolean; hasBottomIn: boolean; hasLeftIn: boolean; hasRightIn: boolean; hasTopOut: boolean; hasBottomOut: boolean; hasLeftOut: boolean; hasRightOut: boolean; }

const calculateHandleDirection = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
};

const applyNodeHandles = (nodes: Node[], nodeHandles: Record<string, NodeHandles>, mode: 'pan' | 'edit'): Node[] => {
  return nodes.map(node => {
    const handles = mode === 'edit'
      ? { hasTopIn: true, hasBottomIn: true, hasLeftIn: true, hasRightIn: true, hasTopOut: true, hasBottomOut: true, hasLeftOut: true, hasRightOut: true }
      : nodeHandles[node.id];
    return { ...node, data: { ...node.data, ...handles } };
  });
};

const buildEdgesFromData = (paths: any[], positions: Record<string, { x: number; y: number }>) => {
  const edges: Edge[] = [];
  const nodeHandles: Record<string, NodeHandles> = {};
  const allNodeIds = ['you', ...paths.map(p => p._id)];
  allNodeIds.forEach(id => { nodeHandles[id] = { hasTopIn: false, hasBottomIn: false, hasLeftIn: false, hasRightIn: false, hasTopOut: false, hasBottomOut: false, hasLeftOut: false, hasRightOut: false }; });

  const createEdge = (sourceId: string, targetId: string, isConnection = false) => {
    const sourcePos = positions[sourceId], targetPos = positions[targetId];
    if (!sourcePos || !targetPos) return;
    const sourceHandle = calculateHandleDirection(sourcePos, targetPos);
    const targetHandle = calculateHandleDirection(targetPos, sourcePos);
    nodeHandles[sourceId][`has${sourceHandle.charAt(0).toUpperCase() + sourceHandle.slice(1)}Out` as keyof NodeHandles] = true;
    nodeHandles[targetId][`has${targetHandle.charAt(0).toUpperCase() + targetHandle.slice(1)}In` as keyof NodeHandles] = true;
    edges.push({ id: `e-${sourceId}-${targetId}`, source: sourceId, sourceHandle: `${sourceHandle}-out`, target: targetId, targetHandle: `${targetHandle}-in`, markerEnd: { type: MarkerType.ArrowClosed }, style: isConnection ? { strokeDasharray: '5,5' } : undefined });
  };

  paths.filter(p => !p.parentId).forEach(path => createEdge('you', path._id));
  paths.filter(p => p.parentId).forEach(path => createEdge(path.parentId, path._id));
  paths.forEach(path => { (path.connectedPathIds || []).forEach((id: string) => createEdge(path._id, id, true)); });

  return { edges, nodeHandles };
};

// ─── Graph Tab Component ─────────────────────────────────────────────

function GraphView({ paths, allSteps }: { paths: Path[]; allSteps: Step[] }) {
  const [mode, setMode] = useState<'pan' | 'edit'>('pan');

  const savedPositions = useMemo(() => loadNodePositions(), []);
  const initialData = useMemo(() => {
    if (!paths.length) return { nodes: [], edges: [] };
    const { nodes, positions } = buildNodesFromData(paths, allSteps, savedPositions);
    const { edges, nodeHandles } = buildEdgesFromData(paths, positions);
    return { nodes: applyNodeHandles(nodes, nodeHandles, 'pan'), edges };
  }, [paths, allSteps, savedPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  useEffect(() => {
    if (paths.length) {
      const { nodes: n, positions } = buildNodesFromData(paths, allSteps, loadNodePositions());
      const { edges: e, nodeHandles } = buildEdgesFromData(paths, positions);
      setNodes(applyNodeHandles(n, nodeHandles, mode));
      setEdges(e);
    }
  }, [paths, allSteps, mode, setNodes, setEdges]);

  const handleNodeDragStop = useCallback(() => {
    if (paths.length && nodes.length) {
      const pos = nodes.reduce((acc, n) => { acc[n.id] = n.position; return acc; }, {} as Record<string, { x: number; y: number }>);
      const { edges: e, nodeHandles } = buildEdgesFromData(paths, pos);
      setNodes(applyNodeHandles(nodes, nodeHandles, mode));
      setEdges(e);
    }
  }, [nodes, paths, mode, setNodes, setEdges]);

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

  const handleReset = useCallback(() => {
    clearSavedState();
    if (paths.length) {
      const { nodes: n, positions } = buildNodesFromData(paths, allSteps, null);
      const { edges: e, nodeHandles } = buildEdgesFromData(paths, positions);
      setNodes(applyNodeHandles(n, nodeHandles, mode));
      setEdges(e);
    }
    window.location.reload();
  }, [paths, allSteps, mode, setNodes, setEdges]);

  if (!paths.length) {
    return (
      <div className="h-[calc(100vh-13rem)] border border-border rounded-lg overflow-hidden bg-background flex items-center justify-center">
        <EmptyState icon={GitBranch} message="No paths to visualize" hint="Create a path in the List tab to see your graph" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Button variant={mode === 'edit' ? 'default' : 'outline'} size="sm" onClick={() => setMode(mode === 'pan' ? 'edit' : 'pan')}>
          {mode === 'pan' ? <><Edit3 className="w-4 h-4 mr-2" />Edit Nodes</> : <><Hand className="w-4 h-4 mr-2" />Pan View</>}
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />Reset
        </Button>
      </div>
      <div className="h-[calc(100vh-16rem)] border border-border rounded-lg overflow-hidden bg-background" style={{ touchAction: 'none' }}>
        <ReactFlow
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop} nodeTypes={nodeTypes} defaultViewport={defaultViewport}
          onMove={(_e, v) => handleMove(v)} fitView={!savedViewport} minZoom={0.1} maxZoom={2}
          panOnDrag={mode === 'pan'} panOnScroll={false} nodesDraggable={mode === 'edit'} selectionOnDrag={false}
          defaultEdgeOptions={{ type: 'default', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </>
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
  const [activeTab, setActiveTab] = useState<'list' | 'graph'>('list');

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">Paths</h1>
          <Tabs defaultValue="list" value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'graph')}>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="graph">Graph</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' && archivedCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? "Hide Archived" : `Show Archived (${archivedCount})`}
            </Button>
          )}
          {activeTab === 'list' && !showArchived && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Path
              <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 font-mono text-[10px]">
                {formatKeybindDisplay(getKeybinds().quickCreatePath)}
              </kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Graph Tab */}
      {activeTab === 'graph' && (
        <GraphView paths={activePaths || []} allSteps={allSteps || []} />
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <>
          {/* Paths Grid */}
          {flattenedPaths.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flattenedPaths.map(({ path, depth }) => {
                const stats = getPathStats(path._id);
                const childCount = getChildPathsCount(path._id);
                const isArchived = showArchived;
                return (
                  <Card key={path._id} className={`transition-colors ${isArchived ? "opacity-60" : "hover:border-primary/50"}`} style={{ marginLeft: `${depth * 16}px` }}>
                    <CardContent className="p-4">
                      {editingPath === path._id ? (
                        <div className="space-y-2">
                          <Input placeholder="Path title" value={editPathForm.title} onChange={(e) => setEditPathForm({ ...editPathForm, title: e.target.value })} maxLength={MAX_TITLE_LENGTH} />
                          <Input placeholder="Description (optional)" value={editPathForm.description} onChange={(e) => setEditPathForm({ ...editPathForm, description: e.target.value })} maxLength={MAX_DESCRIPTION_LENGTH} />
                          <select value={editPathForm.parentId} onChange={(e) => setEditPathForm({ ...editPathForm, parentId: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm">
                            <option value="">Root (no parent)</option>
                            {getParentOptions(path._id).map(({ path: p, depth: d }) => (
                              <option key={p._id} value={p._id}>{"  ".repeat(d)}{d > 0 && "└ "}{p.title}</option>
                            ))}
                          </select>
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={() => updatePath(path._id, editPathForm.title, editPathForm.description, editPathForm.parentId)} disabled={!editPathForm.title.trim()}>Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEditPath}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between h-fit">
                          <div className="flex flex-col flex-1 h-full">
                            <div className="flex items-center gap-2">
                              {depth > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              <h3 className="font-medium">{path.title}</h3>
                              {isArchived && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Archived</span>}
                            </div>
                            {path.description && <p className="text-sm text-muted-foreground mt-1">{path.description}</p>}
                            <div className="flex items-center space-x-3 mt-auto pt-2 text-xs text-muted-foreground">
                              <span>{stats.completed} completed</span><span>•</span>
                              <span className="text-destructive">{stats.failed} failed</span><span>•</span>
                              <span>{stats.incomplete} in progress</span>
                              {childCount > 0 && <><span>•</span><span>{childCount} child path{childCount > 1 ? 's' : ''}</span></>}
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            {isArchived ? (
                              <Button variant="ghost" size="sm" onClick={() => handleUnarchive(path._id)} className="h-7 w-7 p-0" title="Unarchive"><ArchiveRestore className="w-4 h-4" /></Button>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => startEditPath(path)} className="h-7 w-7 p-0" title="Edit"><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleArchive(path._id)} className="h-7 w-7 p-0" title="Archive"><Archive className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteDialogPath(path)} className="h-7 w-7 p-0" title="Delete"><X className="w-4 h-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Target} message={showArchived ? "No archived paths" : "No paths yet"} hint={!showArchived ? "Create a path to get started" : undefined} />
          )}
        </>
      )}

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
