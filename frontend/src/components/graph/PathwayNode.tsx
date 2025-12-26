import { Handle, Position } from 'reactflow';

interface PathwayNodeData {
  label: string;
  description?: string;
  hasTopIn?: boolean;
  hasBottomIn?: boolean;
  hasLeftIn?: boolean;
  hasRightIn?: boolean;
  hasTopOut?: boolean;
  hasBottomOut?: boolean;
  hasLeftOut?: boolean;
  hasRightOut?: boolean;
}

export default function PathwayNode({ data }: { data: PathwayNodeData }) {
  return (
    <div className="px-6 py-4 rounded-lg border-2 border-primary shadow-lg min-w-[180px]" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Incoming handles */}
      {data.hasTopIn && (
        <Handle
          type="target"
          position={Position.Top}
          id="top-in"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasBottomIn && (
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-in"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasLeftIn && (
        <Handle
          type="target"
          position={Position.Left}
          id="left-in"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasRightIn && (
        <Handle
          type="target"
          position={Position.Right}
          id="right-in"
          className="!w-3 !h-3 !bg-primary"
        />
      )}

      <div>
        <div className="font-semibold text-sm text-foreground">{data.label}</div>
        {data.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{data.description}</div>
        )}
      </div>

      {/* Outgoing handles */}
      {data.hasTopOut && (
        <Handle
          type="source"
          position={Position.Top}
          id="top-out"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasBottomOut && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-out"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasLeftOut && (
        <Handle
          type="source"
          position={Position.Left}
          id="left-out"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      {data.hasRightOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          className="!w-3 !h-3 !bg-primary"
        />
      )}
    </div>
  );
}
