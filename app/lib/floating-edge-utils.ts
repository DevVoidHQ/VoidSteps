import { Position } from "reactflow";

/**
 * Floating-edge geometry (ReactFlow v11 recipe). Computes where an edge should
 * meet each node's border based on the line between node centers, so edges
 * connect cleanly without fixed handle points.
 */

type RFNode = any;

function getNodeCenterAndSize(node: RFNode) {
  const width = node.width ?? node.measured?.width ?? 0;
  const height = node.height ?? node.measured?.height ?? 0;
  const pos = node.positionAbsolute ?? node.position ?? { x: 0, y: 0 };
  return { x: pos.x, y: pos.y, width, height };
}

// Point on `node`'s border along the ray toward `target`'s center.
// Circular nodes (the "Me" userNode) use an ellipse border so the line meets
// the visible circle instead of its bounding-box corner.
function getNodeIntersection(node: RFNode, target: RFNode) {
  const a = getNodeCenterAndSize(node);
  const b = getNodeCenterAndSize(target);

  const cx = a.x + a.width / 2;
  const cy = a.y + a.height / 2;
  const ox = b.x + b.width / 2;
  const oy = b.y + b.height / 2;

  const dx = ox - cx;
  const dy = oy - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const w = a.width / 2;
  const h = a.height / 2;

  const scale =
    node.type === "userNode"
      ? 1 / Math.sqrt((dx / w) ** 2 + (dy / h) ** 2) // ellipse border
      : 1 / Math.max(Math.abs(dx) / w, Math.abs(dy) / h); // rectangle border
  return { x: cx + dx * scale, y: cy + dy * scale };
}

// Which side of the node the intersection sits on (for a clean bezier exit).
function getEdgePosition(node: RFNode, point: { x: number; y: number }) {
  const n = getNodeCenterAndSize(node);
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(point.x);
  const py = Math.round(point.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + n.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + n.height - 1) return Position.Bottom;
  return Position.Top;
}

export function getEdgeParams(source: RFNode, target: RFNode) {
  const sourceIntersection = getNodeIntersection(source, target);
  const targetIntersection = getNodeIntersection(target, source);
  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
    sourcePos: getEdgePosition(source, sourceIntersection),
    targetPos: getEdgePosition(target, targetIntersection),
  };
}
