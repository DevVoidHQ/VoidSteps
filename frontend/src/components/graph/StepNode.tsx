import { Handle, Position } from 'reactflow';
import { Circle, CheckCircle2 } from 'lucide-react';

interface StepNodeData {
  label: string;
  completed?: boolean;
  prioritized?: boolean;
}

export default function StepNode({ data }: { data: StepNodeData }) {
  return (
    <div className={`
      px-3 py-2 rounded border shadow-sm min-w-[120px] text-xs
      ${data.prioritized ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 'border-border bg-background'}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-1.5 !h-1.5"
      />
      <div className="flex items-center space-x-1.5">
        {data.completed ? (
          <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
        ) : (
          <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-foreground truncate">{data.label}</span>
      </div>
    </div>
  );
}
