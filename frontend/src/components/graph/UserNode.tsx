import { Handle, Position } from 'reactflow';

interface UserNodeData {
  label: string;
  hasTopOut?: boolean;
  hasBottomOut?: boolean;
  hasLeftOut?: boolean;
  hasRightOut?: boolean;
}

export default function UserNode({ data }: { data: UserNodeData }) {
  return (
    <div className="px-8 py-6 rounded-full border-2 border-primary shadow-xl" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {data.hasTopOut && (
        <Handle
          type="source"
          position={Position.Top}
          id="top-out"
          className="!bg-primary !w-3 !h-3"
        />
      )}
      {data.hasBottomOut && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-out"
          className="!bg-primary !w-3 !h-3"
        />
      )}
      {data.hasLeftOut && (
        <Handle
          type="source"
          position={Position.Left}
          id="left-out"
          className="!bg-primary !w-3 !h-3"
        />
      )}
      {data.hasRightOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          className="!bg-primary !w-3 !h-3"
        />
      )}
      <div className="font-bold text-2xl text-center text-foreground">{data.label}</div>
    </div>
  );
}
