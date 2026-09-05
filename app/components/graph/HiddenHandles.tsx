import { Handle, Position } from "reactflow";

// Floating edges compute their own geometry, so nodes only need invisible,
// non-interactive source/target handles for edges to anchor to.
const hidden = "!w-px !h-px !min-w-0 !min-h-0 !border-0 !bg-transparent opacity-0 pointer-events-none";

export default function HiddenHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} className={hidden} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={hidden} />
    </>
  );
}
