import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { RotateCcw, Hand, Edit3 } from 'lucide-react';

import LoadingScreen from '@/components/LoadingScreen';
import UserNode from '@/components/graph/UserNode';
import PathNode from '@/components/graph/PathNode';
import StepNode from '@/components/graph/StepNode';
import ManagePaths from '@/components/ManagePaths';
import { useData } from '@/contexts/DataContext';

// Define viewport type
type ViewportType = {
  x: number;
  y: number;
  zoom: number;
};

// Storage keys
const VIEWPORT_STORAGE_KEY = 'viz-viewport-v1';
const NODES_STORAGE_KEY = 'viz-nodes-v1';

// Storage utilities
const saveViewport = (viewport: ViewportType) => {
  try {
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport));
  } catch (error) {
    console.error('Failed to save viewport:', error);
  }
};

const loadViewport = (): ViewportType | null => {
  try {
    const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load viewport:', error);
    return null;
  }
};

const saveNodePositions = (nodes: Node[]) => {
  try {
    const positions = nodes.reduce((acc, node) => {
      acc[node.id] = { x: node.position.x, y: node.position.y };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('Failed to save node positions:', error);
  }
};

const loadNodePositions = (): Record<string, { x: number; y: number }> | null => {
  try {
    const saved = localStorage.getItem(NODES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load node positions:', error);
    return null;
  }
};

const clearSavedState = () => {
  localStorage.removeItem(VIEWPORT_STORAGE_KEY);
  localStorage.removeItem(NODES_STORAGE_KEY);
};

const nodeTypes = {
  userNode: UserNode,
  pathNode: PathNode,
  stepNode: StepNode,
};

// Build nodes from real data
const buildNodesFromData = (
  paths: any[],
  steps: any[],
  savedPositions: Record<string, { x: number; y: number }> | null
): { nodes: Node[]; positions: Record<string, { x: number; y: number }> } => {
  const nodes: Node[] = [];
  const positions: Record<string, { x: number; y: number }> = {};

  // Separate root paths (no parentId) from child paths
  const rootPaths = paths.filter(p => !p.parentId);
  const childPaths = paths.filter(p => p.parentId);

  // User node at center top
  const youPosition = savedPositions?.['you'] || { x: 400, y: 50 };
  positions['you'] = youPosition;
  nodes.push({
    id: 'you',
    type: 'userNode',
    position: youPosition,
    data: {
      label: 'Me',
    },
  });

  // Root paths (directly connected to user)
  const spacing = 250;
  const startX = 400 - (rootPaths.length * spacing) / 2;

  rootPaths.forEach((path, index) => {
    const pathSteps = steps.filter(s => s.pathId === path._id);
    const completedCount = pathSteps.filter(s => s.completed).length;
    const failedCount = pathSteps.filter(s => s.failed).length;
    const inProgressCount = pathSteps.filter(s => !s.completed && !s.failed).length;

    const position = savedPositions?.[path._id] || { x: startX + index * spacing, y: 200 };
    positions[path._id] = position;
    nodes.push({
      id: path._id,
      type: 'pathNode',
      position,
      data: {
        label: path.title,
        description: path.description,
        completedCount,
        failedCount,
        inProgressCount,
        isRoot: true,
      },
    });
  });

  // Child paths (grouped by depth level)
  // Build a map of parentId -> children for easier processing
  const childMap = new Map<string, any[]>();
  childPaths.forEach(path => {
    const parentId = path.parentId;
    if (!childMap.has(parentId)) {
      childMap.set(parentId, []);
    }
    childMap.get(parentId)!.push(path);
  });

  // Process children level by level
  let currentLevel = rootPaths.map(p => p._id);
  let yOffset = 350;

  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    let xIndex = 0;

    currentLevel.forEach(parentId => {
      const children = childMap.get(parentId) || [];
      children.forEach(path => {
        const pathSteps = steps.filter(s => s.pathId === path._id);
        const completedCount = pathSteps.filter(s => s.completed).length;
        const failedCount = pathSteps.filter(s => s.failed).length;
        const inProgressCount = pathSteps.filter(s => !s.completed && !s.failed).length;

        const position = savedPositions?.[path._id] || { x: 100 + xIndex * 200, y: yOffset };
        positions[path._id] = position;
        nodes.push({
          id: path._id,
          type: 'pathNode',
          position,
          data: {
            label: path.title,
            description: path.description,
            completedCount,
            failedCount,
            inProgressCount,
            isRoot: false,
          },
        });

        nextLevel.push(path._id);
        xIndex++;
      });
    });

    currentLevel = nextLevel;
    yOffset += 150;
  }

  return { nodes, positions };
};

// Extract positions from nodes array
const extractPositionsFromNodes = (nodes: Node[]): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach(node => {
    positions[node.id] = node.position;
  });
  return positions;
};

// Calculate handle direction based on position
const calculateHandleDirection = (
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): string => {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // Determine which direction is dominant
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominance
    return dx > 0 ? 'right' : 'left';
  } else {
    // Vertical dominance
    return dy > 0 ? 'bottom' : 'top';
  }
};

// Initialize node handles structure
interface NodeHandles {
  hasTopIn: boolean;
  hasBottomIn: boolean;
  hasLeftIn: boolean;
  hasRightIn: boolean;
  hasTopOut: boolean;
  hasBottomOut: boolean;
  hasLeftOut: boolean;
  hasRightOut: boolean;
}

// Apply node handles to nodes array
const applyNodeHandles = (
  nodes: Node[],
  nodeHandles: Record<string, NodeHandles>,
  mode: 'pan' | 'edit'
): Node[] => {
  return nodes.map(node => {
    // In edit mode, show all handles; in pan mode, show only used handles
    const handles = mode === 'edit'
      ? {
          hasTopIn: true,
          hasBottomIn: true,
          hasLeftIn: true,
          hasRightIn: true,
          hasTopOut: true,
          hasBottomOut: true,
          hasLeftOut: true,
          hasRightOut: true,
        }
      : nodeHandles[node.id];

    return {
      ...node,
      data: {
        ...node.data,
        ...handles,
      },
    };
  });
};

// Build edges from relationships
const buildEdgesFromData = (
  paths: any[],
  positions: Record<string, { x: number; y: number }>
): { edges: Edge[]; nodeHandles: Record<string, NodeHandles> } => {
  const edges: Edge[] = [];
  const nodeHandles: Record<string, NodeHandles> = {};

  // Initialize node handles for all nodes
  const allNodeIds = ['you', ...paths.map(p => p._id)];
  allNodeIds.forEach(id => {
    nodeHandles[id] = {
      hasTopIn: false,
      hasBottomIn: false,
      hasLeftIn: false,
      hasRightIn: false,
      hasTopOut: false,
      hasBottomOut: false,
      hasLeftOut: false,
      hasRightOut: false,
    };
  });

  // Helper to create edge with position-based handles
  const createEdge = (
    sourceId: string,
    targetId: string,
    isConnection: boolean = false
  ) => {
    const sourcePos = positions[sourceId];
    const targetPos = positions[targetId];

    if (!sourcePos || !targetPos) {
      console.warn(`Skipping edge ${sourceId} -> ${targetId}: position not found`);
      return;
    }

    // Calculate handles
    const sourceHandle = calculateHandleDirection(sourcePos, targetPos);
    const targetHandle = calculateHandleDirection(targetPos, sourcePos);

    // Track used handles
    nodeHandles[sourceId][`has${sourceHandle.charAt(0).toUpperCase() + sourceHandle.slice(1)}Out` as keyof NodeHandles] = true;
    nodeHandles[targetId][`has${targetHandle.charAt(0).toUpperCase() + targetHandle.slice(1)}In` as keyof NodeHandles] = true;

    edges.push({
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      sourceHandle: `${sourceHandle}-out`,
      target: targetId,
      targetHandle: `${targetHandle}-in`,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: isConnection ? { strokeDasharray: '5,5' } : undefined,
    });
  };

  // Root paths (no parentId) connect to User node
  const rootPaths = paths.filter(p => !p.parentId);
  rootPaths.forEach(path => {
    createEdge('you', path._id, false);
  });

  // Child paths connect to their parent paths
  const childPaths = paths.filter(p => p.parentId);
  childPaths.forEach(path => {
    if (path.parentId) {
      createEdge(path.parentId, path._id, false);
    }
  });

  // Path-to-Path connections (connectedPathIds) - dashed lines
  paths.forEach(path => {
    if (path.connectedPathIds && path.connectedPathIds.length > 0) {
      path.connectedPathIds.forEach((connectedPathId: string) => {
        createEdge(path._id, connectedPathId, true);
      });
    }
  });

  return { edges, nodeHandles };
};

export default function Pathway() {
  const { activePaths: paths, allSteps, isLoading } = useData();
  const [mode, setMode] = useState<'pan' | 'edit'>('pan');
  const [activeTab, setActiveTab] = useState<'graph' | 'manage'>('graph');

  // Build initial nodes and edges from real data
  const savedPositions = useMemo(() => loadNodePositions(), []);
  const initialData = useMemo(() => {
    if (!paths || !allSteps) return { nodes: [], edges: [] };

    const { nodes, positions } = buildNodesFromData(paths, allSteps, savedPositions);
    const { edges, nodeHandles } = buildEdgesFromData(paths, positions);
    const nodesWithHandles = applyNodeHandles(nodes, nodeHandles, 'pan');

    return { nodes: nodesWithHandles, edges };
  }, [paths, allSteps, savedPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Update nodes and edges when data changes or mode changes
  useEffect(() => {
    if (paths && allSteps) {
      const { nodes: newNodes, positions } = buildNodesFromData(paths, allSteps, loadNodePositions());
      const { edges: newEdges, nodeHandles } = buildEdgesFromData(paths, positions);
      const nodesWithHandles = applyNodeHandles(newNodes, nodeHandles, mode);

      setNodes(nodesWithHandles);
      setEdges(newEdges);
    }
  }, [paths, allSteps, mode, setNodes, setEdges]);

  // Recalculate edges and handles when node dragging stops
  const handleNodeDragStop = useCallback(() => {
    if (paths && nodes.length > 0) {
      const currentPositions = extractPositionsFromNodes(nodes);
      const { edges: newEdges, nodeHandles } = buildEdgesFromData(paths, currentPositions);
      const nodesWithHandles = applyNodeHandles(nodes, nodeHandles, mode);

      setNodes(nodesWithHandles);
      setEdges(newEdges);
    }
  }, [nodes, paths, mode, setNodes, setEdges]);

  // Load saved viewport
  const savedViewport = loadViewport();
  const defaultViewport = savedViewport || { x: 0, y: 0, zoom: 1 };

  // Debounce timer for saving viewport
  const saveViewportTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Handle viewport changes (pan/zoom)
  const handleMove = useCallback((viewport: ViewportType) => {
    // Debounce saving to avoid excessive localStorage writes
    if (saveViewportTimer.current) {
      clearTimeout(saveViewportTimer.current);
    }
    saveViewportTimer.current = setTimeout(() => {
      saveViewport(viewport);
    }, 500);
  }, []);

  // Save node positions when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveNodePositions(nodes);
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Handle reset
  const handleReset = useCallback(() => {
    clearSavedState();
    if (paths && allSteps) {
      const { nodes: resetNodes, positions } = buildNodesFromData(paths, allSteps, null);
      const { edges: resetEdges, nodeHandles } = buildEdgesFromData(paths, positions);
      const nodesWithHandles = applyNodeHandles(resetNodes, nodeHandles, mode);

      setNodes(nodesWithHandles);
      setEdges(resetEdges);
    }
    window.location.reload(); // Reload to reset viewport
  }, [paths, allSteps, mode, setNodes, setEdges]);

  if (isLoading) {
    return <LoadingScreen message="Loading pathway..." fullScreen={false} />;
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full">
      <Tabs defaultValue="graph" value={activeTab} onValueChange={(value) => setActiveTab(value as 'graph' | 'manage')}>
        {/* Compact Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight">Pathway</h1>
            <TabsList>
              <TabsTrigger value="graph">Graph</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>
          </div>

          {/* Controls - only visible on Graph tab */}
          {activeTab === 'graph' && (
            <div className="flex items-center space-x-2">
              <Button
                variant={mode === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(mode === 'pan' ? 'edit' : 'pan')}
                className="flex items-center space-x-2 h-8"
              >
                {mode === 'pan' ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Nodes</span>
                  </>
                ) : (
                  <>
                    <Hand className="w-4 h-4" />
                    <span>Pan View</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center space-x-2 h-8"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </Button>
            </div>
          )}
        </div>

        {/* Manage Tab */}
        <TabsContent value="manage">
          <ManagePaths paths={paths || []} steps={allSteps || []} />
        </TabsContent>

        {/* Graph Tab */}
        <TabsContent value="graph" className="mt-0">
          <div className="h-[calc(100vh-13rem)] border border-border rounded-lg overflow-hidden bg-background" style={{ touchAction: 'none' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              defaultViewport={defaultViewport}
              onMove={(_event, viewport) => handleMove(viewport)}
              fitView={!savedViewport}
              minZoom={0.1}
              maxZoom={2}
              panOnDrag={mode === 'pan'}
              panOnScroll={false}
              nodesDraggable={mode === 'edit'}
              selectionOnDrag={false}
              defaultEdgeOptions={{
                type: 'default',
                animated: false,
                style: { stroke: '#94a3b8', strokeWidth: 2 },
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls />
            </ReactFlow>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
