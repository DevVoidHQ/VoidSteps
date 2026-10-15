import { Target, CheckCircle2, XCircle, Circle } from "lucide-react";
import HiddenHandles from "./HiddenHandles";

interface PathNodeData {
  label: string;
  description?: string;
  completedCount: number;
  failedCount: number;
  inProgressCount: number;
  isRoot?: boolean;
}

export default function PathNode({ data }: { data: PathNodeData }) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Root paths sit a level higher and larger; depth, not outlines, sets them apart.
  const borderClass = data.isRoot
    ? "px-6 py-4 rounded-lg bg-card shadow-elev-3 min-w-[180px]"
    : "px-4 py-3 rounded-md bg-card shadow-elev-2 min-w-[180px]";

  return (
    <div className={borderClass}>
      <HiddenHandles />

      <div className="flex items-start space-x-2">
        <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="type-title text-foreground">{data.label}</div>
          {data.description && (
            <div className="type-meta text-muted-foreground mt-0.5">
              {truncateText(data.description, 40)}
            </div>
          )}

          {/* Step Statistics */}
          <div className="flex items-center gap-3 mt-2 type-meta">
            <div className="flex items-center gap-1" title="Completed">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span className="text-foreground">{data.completedCount}</span>
            </div>
            <div className="flex items-center gap-1" title="In progress">
              <Circle className="w-3 h-3 text-info" />
              <span className="text-foreground">{data.inProgressCount}</span>
            </div>
            <div className="flex items-center gap-1" title="Failed">
              <XCircle className="w-3 h-3 text-destructive-ink" />
              <span className="text-foreground">{data.failedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
