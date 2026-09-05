import { Circle, CheckCircle2 } from "lucide-react";
import HiddenHandles from "./HiddenHandles";

interface StepNodeData {
  label: string;
  completed?: boolean;
  prioritized?: boolean;
}

export default function StepNode({ data }: { data: StepNodeData }) {
  return (
    <div
      className={`
      px-3 py-2 rounded border shadow-sm min-w-[120px] text-xs
      ${data.prioritized ? "border-warning bg-warning/10" : "border-border bg-background"}
    `}
    >
      <HiddenHandles />
      <div className="flex items-center space-x-1.5">
        {data.completed ? (
          <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
        ) : (
          <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-foreground truncate">{data.label}</span>
      </div>
    </div>
  );
}
