import type { Step, Path } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  X,
  Repeat,
  Star,
  Target,
  Pencil,
  XCircle,
} from "lucide-react";

export interface StepCardProps {
  step: Step;
  paths: Path[];
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  isEditing: boolean;
  editForm: { title: string; description: string; pathId: string };
  onStartEdit: (step: Step) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onEditFormChange: (
    updates: Partial<{ title: string; description: string; pathId: string }>
  ) => void;
}

export function StepCard({
  step,
  paths,
  onToggle,
  onToggleFailed,
  onDelete,
  onTogglePriority,
  isEditing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
}: StepCardProps) {
  if (isEditing) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-3 space-y-2">
          <Input
            placeholder="Step title"
            value={editForm.title}
            onChange={(e) => onEditFormChange({ title: e.target.value })}
          />
          <Input
            placeholder="Description (optional)"
            value={editForm.description}
            onChange={(e) => onEditFormChange({ description: e.target.value })}
          />
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={editForm.pathId}
            onChange={(e) => onEditFormChange({ pathId: e.target.value })}
          >
            <option value="">No Path</option>
            {paths?.map((path: Path) => (
              <option key={path._id} value={path._id}>
                {path.title}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() =>
                onSaveEdit(step._id, {
                  title: editForm.title,
                  description: editForm.description,
                  pathId: editForm.pathId as unknown as Path | null,
                })
              }
              disabled={!editForm.title.trim()}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:bg-muted/30 transition-colors ${step.failed === true ? 'border-destructive/50' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => onToggle(step._id)}
            className="mt-0.5 flex-shrink-0"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                step.completed
                  ? "bg-primary border-primary"
                  : step.failed === true
                  ? "bg-destructive border-destructive"
                  : "border-muted-foreground hover:border-primary"
              }`}
            >
              {step.completed && <Check className="w-3 h-3 text-black" />}
              {step.failed === true && <X className="w-3 h-3 text-black" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span
                  className={`font-medium ${
                    step.completed
                      ? "line-through text-muted-foreground"
                      : step.failed === true
                      ? "line-through text-destructive"
                      : ""
                  }`}
                >
                  {step.title}
                </span>
                {step.recurring.enabled && (
                  <Repeat className="w-3 h-3 text-primary flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                {onToggleFailed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFailed(step._id)}
                    className="h-7 w-7 p-0"
                  >
                    <XCircle
                      className={`w-4 h-4 ${
                        step.failed === true
                          ? "fill-destructive text-destructive"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onTogglePriority(step._id, step.prioritizedToday)
                  }
                  className="h-7 w-7 p-0"
                >
                  <Star
                    className={`w-4 h-4 ${
                      step.prioritizedToday
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartEdit(step)}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(step._id)}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
            {(step.pathId || step.path) && (
              <div className="mt-1 text-xs text-primary flex items-center">
                <Target className="w-3 h-3 mr-1" />
                {step.path?.title || (typeof step.pathId === "object" && step.pathId ? step.pathId.title : "")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
