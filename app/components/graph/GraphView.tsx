import { EmptyState } from "@/components/ui/EmptyState";
import type { Path, Step } from "@/types/index";
import { GitBranch } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

// Graph imports
import FloatingEdge from "@/components/graph/FloatingEdge";
import PathNode from "@/components/graph/PathNode";
import StepNode from "@/components/graph/StepNode";
import UserNode from "@/components/graph/UserNode";
import type { Edge, Node } from "reactflow";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

// ─── Graph utilities (from Pathway.tsx) ──────────────────────────────

type ViewportType = { x: number; y: number; zoom: number };

const VIEWPORT_STORAGE_KEY = "viz-viewport-v1";
const NODES_STORAGE_KEY = "viz-nodes-v1";

const saveViewport = (viewport: ViewportType) => {
  try {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport));
  } catch {}
};
const loadViewport = (): ViewportType | null => {
  try {
    const s = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};
const saveNodePositions = (nodes: Node[]) => {
  try {
    const positions = nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.position;
        return acc;
      },
      {} as Record<string, { x: number; y: number }>
    );
    localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(positions));
  } catch {}
};
const loadNodePositions = (): Record<string, { x: number; y: number }> | null => {
  try {
    const s = localStorage.getItem(NODES_STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
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

const buildNodesFromData = (
  paths: any[],
  steps: any[],
  savedPositions: Record<string, { x: number; y: number }> | null
) => {
  const nodes: Node[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  const rootPaths = paths.filter((p) => !p.parentId);
  const childPaths = paths.filter((p) => p.parentId);

  const youPosition = savedPositions?.["you"] || { x: 400, y: 50 };
  positions["you"] = youPosition;
  nodes.push({ id: "you", type: "userNode", position: youPosition, data: { label: "Me" } });

  const spacing = 250;
  rootPaths.forEach((path, index) => {
    const pathSteps = steps.filter((s: any) => s.pathId === path._id);
    // New (unsaved) root paths drop centered below "Me", nudged to avoid overlap.
    const position =
      savedPositions?.[path._id] ??
      findFreeSpot(
        {
          x: youPosition.x + (index - (rootPaths.length - 1) / 2) * spacing,
          y: youPosition.y + 180,
        },
        Object.values(positions)
      );
    positions[path._id] = position;
    nodes.push({
      id: path._id,
      type: "pathNode",
      position,
      data: {
        label: path.title,
        description: path.description,
        completedCount: pathSteps.filter((s: any) => s.completed).length,
        failedCount: pathSteps.filter((s: any) => s.failed).length,
        inProgressCount: pathSteps.filter((s: any) => !s.completed && !s.failed).length,
        isRoot: true,
      },
    });
  });

  const childMap = new Map<string, any[]>();
  childPaths.forEach((path) => {
    if (!childMap.has(path.parentId)) childMap.set(path.parentId, []);
    childMap.get(path.parentId)!.push(path);
  });

  let currentLevel = rootPaths.map((p) => p._id);
  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    currentLevel.forEach((parentId) => {
      const siblings = childMap.get(parentId) || [];
      const parentPos = positions[parentId] || { x: 400, y: 200 };
      siblings.forEach((path, sibIdx) => {
        const pathSteps = steps.filter((s: any) => s.pathId === path._id);
        // New (unsaved) child paths drop centered below their parent, nudged to avoid overlap.
        const position =
          savedPositions?.[path._id] ??
          findFreeSpot(
            { x: parentPos.x + (sibIdx - (siblings.length - 1) / 2) * 220, y: parentPos.y + 180 },
            Object.values(positions)
          );
        positions[path._id] = position;
        nodes.push({
          id: path._id,
          type: "pathNode",
          position,
          data: {
            label: path.title,
            description: path.description,
            completedCount: pathSteps.filter((s: any) => s.completed).length,
            failedCount: pathSteps.filter((s: any) => s.failed).length,
            inProgressCount: pathSteps.filter((s: any) => !s.completed && !s.failed).length,
            isRoot: false,
          },
        });
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
      type: "floating",
    });
  };

  paths.filter((p) => !p.parentId).forEach((path) => createEdge("you", path._id));
  paths.filter((p) => p.parentId).forEach((path) => createEdge(path.parentId, path._id));

  return edges;
};

// ─── Graph Tab Component ─────────────────────────────────────────────

export default function GraphView({
  paths,
  allSteps,
  sidebarOpen,
  onReparent,
}: {
  paths: Path[];
  allSteps: Step[];
  sidebarOpen: boolean;
  onReparent: (childId: string, parentId: string | null) => void;
}) {
  const rfRef = useRef<any>(null);
  const firstFit = useRef(true);

  // Recenter when the canvas width changes (sidebar collapse/expand).
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
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

  // On drop: persist positions, and if the node landed on another node, nest it
  // under that node (drop on the "Me" center to make it a top-level path).

  const handleNodeDragStop = useCallback(
    (_e: any, node: any) => {
      saveNodePositions(nodes);
      const inst = rfRef.current;
      if (!node || node.id === "you" || !inst?.getIntersectingNodes) return;
      const hits = inst.getIntersectingNodes(node).filter((n: any) => n.id !== node.id);
      if (!hits.length) return;
      const target = hits[0];
      const current = paths.find((p) => p._id === node.id);
      if (!current) return;
      if (target.id === "you") {
        if (current.parentId) onReparent(node.id, null); // drop on center = make root
        return;
      }
      if (target.id === current.parentId) return; // already its parent
      onReparent(node.id, target.id);
    },
    [nodes, paths, onReparent]
  );

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
        <EmptyState
          icon={GitBranch}
          message="No paths to visualize"
          hint="A path is a goal you are working toward. Create one with New Path."
        />
      </div>
    );
  }

  return (
    <div
      className="h-full border border-border rounded-lg overflow-hidden bg-background"
      style={{ touchAction: "none" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(inst) => {
          rfRef.current = inst;
        }}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={defaultViewport}
        onMove={(_e, v) => handleMove(v)}
        fitView={!savedViewport}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        selectionOnDrag={false}
        // Edges mirror path relationships - never user-editable. Lock all
        // connect/reconnect/delete interactions so dragging can't unlink nodes.
        nodesConnectable={false}
        edgesUpdatable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "floating",
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        {/* Zoom in/out + fit-to-view (recenter) so users never get lost. */}
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
