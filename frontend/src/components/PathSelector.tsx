import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Path } from "@/types";

interface PathSelectorProps {
  paths: Path[];
  selectedPathIds: string[];
  onPathToggle: (pathId: string) => void;
}

export default function PathSelector({
  paths,
  selectedPathIds,
  onPathToggle,
}: PathSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (paths.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">No paths available</div>
    );
  }

  return (
    <div className="border border-border rounded-md">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">
          Assign Paths ({selectedPathIds.length} selected)
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-border p-3 max-h-48 overflow-y-auto space-y-2">
          {paths.map((path) => (
            <label
              key={path._id}
              className="flex items-center space-x-2 cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedPathIds.includes(path._id)}
                onChange={() => onPathToggle(path._id)}
                className="w-4 h-4 rounded border-input"
              />
              <div className="flex-1">
                <div className="text-sm">{path.title}</div>
                {path.description && (
                  <div className="text-xs text-muted-foreground">
                    {path.description}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
