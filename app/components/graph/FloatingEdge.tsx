import { useCallback } from "react";
import { useStore, getBezierPath, type EdgeProps, type ReactFlowState } from "reactflow";
import { getEdgeParams } from "@/lib/floating-edge-utils";

/**
 * Edge that floats around node borders - its endpoints slide to the point on
 * each node facing the other, instead of attaching to fixed handle dots.
 */
export default function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useStore(useCallback((s: ReactFlowState) => s.nodeInternals.get(source), [source]));
  const targetNode = useStore(useCallback((s: ReactFlowState) => s.nodeInternals.get(target), [target]));

  // Wait until both nodes are measured, otherwise endpoints land at (0,0).
  if (!sourceNode || !targetNode || !sourceNode.width || !targetNode.width) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return <path id={id} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} style={style} />;
}
