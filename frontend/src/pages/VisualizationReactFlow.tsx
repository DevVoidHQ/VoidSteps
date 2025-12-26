import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { RotateCcw, Hand, Edit3 } from 'lucide-react';

import UserNode from '@/components/graph/UserNode';
import PathwayNode from '@/components/graph/PathwayNode';
import PathNode from '@/components/graph/PathNode';
import StepNode from '@/components/graph/StepNode';

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
  pathwayNode: PathwayNode,
  pathNode: PathNode,
  stepNode: StepNode,
};

// Mock data structure
const mockData = {
  user: { id: 'you', name: 'YOU' },
  pathways: [
    { id: 'pw1', title: 'Career Growth', color: '#3b82f6', icon: '💼', parentId: null },
    { id: 'pw2', title: 'Health & Fitness', color: '#22c55e', icon: '💪', parentId: null },
    { id: 'pw3', title: 'Financial Freedom', color: '#eab308', icon: '💰', parentId: null },
    { id: 'pw4', title: 'Learning & Skills', color: '#8b5cf6', icon: '📚', parentId: 'pw1' }, // nested in Career
  ],
  paths: [
    { id: 'p1', title: 'TypeScript Mastery', description: 'Become TS expert', pathwayId: 'pw4' },
    { id: 'p2', title: 'System Design', description: 'Learn architecture', pathwayId: 'pw1' },
    { id: 'p3', title: 'Morning Routine', description: 'Daily fitness', pathwayId: 'pw2' },
    { id: 'p4', title: 'Investment Strategy', description: 'Passive income', pathwayId: 'pw3' },
    { id: 'p5', title: 'React Projects', description: 'Build portfolio', pathwayId: 'pw4' },
  ],
  steps: [
    { id: 's1', title: 'Read TS Handbook', pathId: 'p1', completed: false, failed: false },
    { id: 's2', title: 'Build type-safe API', pathId: 'p1', completed: false, failed: false },
    { id: 's3', title: 'Study CAP theorem', pathId: 'p2', completed: true, failed: false },
    { id: 's4', title: 'Morning run 5km', pathId: 'p3', completed: false, failed: true },
    { id: 's5', title: 'Research index funds', pathId: 'p4', completed: false, failed: false },
    { id: 's6', title: 'Build todo app', pathId: 'p5', completed: true, failed: false },
    { id: 's7', title: 'Advanced TS types', pathId: 'p1', completed: true, failed: false },
  ],
};

// Calculate step statistics for each path
const calculatePathStats = (pathId: string) => {
  const pathSteps = mockData.steps.filter(step => step.pathId === pathId);
  return {
    completedCount: pathSteps.filter(s => s.completed).length,
    failedCount: pathSteps.filter(s => s.failed).length,
    inProgressCount: pathSteps.filter(s => !s.completed && !s.failed).length,
  };
};

// Default node positions
const defaultNodePositions: Node[] = [
  // User node at center top
  {
    id: 'you',
    type: 'userNode',
    position: { x: 400, y: 50 },
    data: {},
  },

  // Pathways
  {
    id: 'pw1',
    type: 'pathwayNode',
    position: { x: 100, y: 200 },
    data: { label: 'Career Growth', color: '#3b82f6', icon: '💼' },
  },
  {
    id: 'pw2',
    type: 'pathwayNode',
    position: { x: 350, y: 200 },
    data: { label: 'Health & Fitness', color: '#22c55e', icon: '💪' },
  },
  {
    id: 'pw3',
    type: 'pathwayNode',
    position: { x: 650, y: 200 },
    data: { label: 'Financial Freedom', color: '#eab308', icon: '💰' },
  },
  {
    id: 'pw4',
    type: 'pathwayNode',
    position: { x: 80, y: 350 },
    data: { label: 'Learning & Skills', color: '#8b5cf6', icon: '📚' },
  },

  // Paths (with step statistics)
  {
    id: 'p1',
    type: 'pathNode',
    position: { x: 30, y: 500 },
    data: {
      label: 'TypeScript Mastery',
      description: 'Become TS expert',
      ...calculatePathStats('p1')
    },
  },
  {
    id: 'p2',
    type: 'pathNode',
    position: { x: 220, y: 350 },
    data: {
      label: 'System Design',
      description: 'Learn architecture',
      ...calculatePathStats('p2')
    },
  },
  {
    id: 'p3',
    type: 'pathNode',
    position: { x: 350, y: 350 },
    data: {
      label: 'Morning Routine',
      description: 'Daily fitness',
      ...calculatePathStats('p3')
    },
  },
  {
    id: 'p4',
    type: 'pathNode',
    position: { x: 650, y: 350 },
    data: {
      label: 'Investment Strategy',
      description: 'Passive income',
      ...calculatePathStats('p4')
    },
  },
  {
    id: 'p5',
    type: 'pathNode',
    position: { x: 200, y: 500 },
    data: {
      label: 'React Projects',
      description: 'Build portfolio',
      ...calculatePathStats('p5')
    },
  },
];

// Convert mock data to ReactFlow edges
const initialEdges: Edge[] = [
  // User to root pathways
  { id: 'e-you-pw1', source: 'you', target: 'pw1', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-you-pw2', source: 'you', target: 'pw2', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-you-pw3', source: 'you', target: 'pw3', markerEnd: { type: 'arrowclosed' } },

  // Pathway to nested pathway
  { id: 'e-pw1-pw4', source: 'pw1', target: 'pw4', markerEnd: { type: 'arrowclosed' } },

  // Pathways to paths
  { id: 'e-pw1-p2', source: 'pw1', target: 'p2', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-pw2-p3', source: 'pw2', target: 'p3', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-pw3-p4', source: 'pw3', target: 'p4', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-pw4-p1', source: 'pw4', target: 'p1', markerEnd: { type: 'arrowclosed' } },
  { id: 'e-pw4-p5', source: 'pw4', target: 'p5', markerEnd: { type: 'arrowclosed' } },
];

// Merge saved positions with default nodes
const getInitialNodes = (): Node[] => {
  const savedPositions = loadNodePositions();
  if (!savedPositions) return defaultNodePositions;

  return defaultNodePositions.map(node => {
    const savedPos = savedPositions[node.id];
    if (savedPos) {
      return { ...node, position: savedPos };
    }
    return node;
  });
};

export default function Visualization() {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [mode, setMode] = useState<'pan' | 'edit'>('pan');

  // Load saved viewport
  const savedViewport = loadViewport();
  const defaultViewport = savedViewport || { x: 0, y: 0, zoom: 1 };

  // Debounce timer for saving viewport
  const saveViewportTimer = useRef<NodeJS.Timeout>();

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

  // Save node positions when they change (for future when dragging is enabled)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveNodePositions(nodes);
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Handle reset
  const handleReset = useCallback(() => {
    clearSavedState();
    setNodes(defaultNodePositions);
    window.location.reload(); // Reload to reset viewport
  }, [setNodes]);

  return (
    <div className="h-[calc(100vh-6rem)] w-full">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Graph</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'pan'
              ? 'Drag to pan, pinch to zoom'
              : 'Drag nodes to reposition them'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode(mode === 'pan' ? 'edit' : 'pan')}
            className="flex items-center space-x-2"
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
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      <div className="h-full border border-border rounded-lg overflow-hidden bg-background" style={{ touchAction: 'none' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
