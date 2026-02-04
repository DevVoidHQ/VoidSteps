import { Handle, Position } from 'reactflow';
import { Target, CheckCircle2, XCircle, Circle } from 'lucide-react';

interface PathNodeData {
  label: string;
  description?: string;
  completedCount: number;
  failedCount: number;
  inProgressCount: number;
  isRoot?: boolean;
  hasTopIn?: boolean;
  hasBottomIn?: boolean;
  hasLeftIn?: boolean;
  hasRightIn?: boolean;
  hasTopOut?: boolean;
  hasBottomOut?: boolean;
  hasLeftOut?: boolean;
  hasRightOut?: boolean;
}

export default function PathNode({ data }: { data: PathNodeData }) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Root paths get thicker border styling (similar to old PathwayNode)
  const borderClass = data.isRoot
    ? "px-6 py-4 rounded-lg border-2 border-primary shadow-lg min-w-[180px]"
    : "px-4 py-3 rounded-md border border-primary shadow-md min-w-[180px]";

  return (
    <div className={borderClass} style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Incoming handles */}
      {data.hasTopIn && (
        <Handle
          type="target"
          position={Position.Top}
          id="top-in"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasBottomIn && (
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-in"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasLeftIn && (
        <Handle
          type="target"
          position={Position.Left}
          id="left-in"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasRightIn && (
        <Handle
          type="target"
          position={Position.Right}
          id="right-in"
          className="!bg-primary !w-2 !h-2"
        />
      )}

      <div className="flex items-start space-x-2">
        <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-sm text-foreground">{data.label}</div>
          {data.description && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {truncateText(data.description, 40)}
            </div>
          )}

          {/* Step Statistics */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1" title="Completed">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-foreground">{data.completedCount}</span>
            </div>
            <div className="flex items-center gap-1" title="In Progress">
              <Circle className="w-3 h-3 text-blue-600" />
              <span className="text-foreground">{data.inProgressCount}</span>
            </div>
            <div className="flex items-center gap-1" title="Failed">
              <XCircle className="w-3 h-3 text-red-600" />
              <span className="text-foreground">{data.failedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outgoing handles */}
      {data.hasTopOut && (
        <Handle
          type="source"
          position={Position.Top}
          id="top-out"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasBottomOut && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-out"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasLeftOut && (
        <Handle
          type="source"
          position={Position.Left}
          id="left-out"
          className="!bg-primary !w-2 !h-2"
        />
      )}
      {data.hasRightOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          className="!bg-primary !w-2 !h-2"
        />
      )}
    </div>
  );
}
