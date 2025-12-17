import { useState } from "react";
import type { Step, Path } from "@/types/index";
import {
  useSteps,
  usePaths,
  useCreatePath,
  useUpdatePath,
  useDeletePath,
} from "@/lib/convex-hooks";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  X,
  Target,
  Pencil,
} from "lucide-react";

export default function Paths() {
  const allSteps = useSteps();
  const paths = usePaths();

  const createPathMutation = useCreatePath();
  const updatePathMutation = useUpdatePath();
  const deletePathMutation = useDeletePath();

  const [pathAddValue, setPathAddValue] = useState("");
  const [pathDescValue, setPathDescValue] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathForm, setEditPathForm] = useState({
    title: "",
    description: "",
  });

  const createPath = async (title: string, description?: string) => {
    try {
      await createPathMutation({ title, description: description || "" });
    } catch (error) {
      console.error("Error creating path:", error);
    }
  };

  const updatePath = async (id: string, title: string, description: string) => {
    try {
      await updatePathMutation({ id: id as Id<"paths">, title, description });
      setEditingPath(null);
    } catch (error) {
      console.error("Error updating path:", error);
    }
  };

  const startEditPath = (path: Path) => {
    setEditingPath(path._id);
    setEditPathForm({ title: path.title, description: path.description || "" });
  };

  const cancelEditPath = () => {
    setEditingPath(null);
    setEditPathForm({ title: "", description: "" });
  };

  const deletePath = async (id: string) => {
    await deletePathMutation({ id: id as Id<"paths"> });
  };

  const getPathStats = (pathId: string) => {
    if (!allSteps) return { total: 0, completed: 0, failed: 0, incomplete: 0 };

    const pathSteps = allSteps.filter((step: Step) => {
      const stepPathId = step.path?._id || (typeof step.pathId === 'string' ? step.pathId : null);
      return stepPathId === pathId;
    });
    return {
      total: pathSteps.length,
      completed: pathSteps.filter((s: Step) => s.completed).length,
      failed: pathSteps.filter((s: Step) => s.failed === true).length,
      incomplete: pathSteps.filter((s: Step) => !s.completed && s.failed !== true).length,
    };
  };

  const handlePathAdd = () => {
    if (pathAddValue.trim()) {
      createPath(pathAddValue.trim(), pathDescValue.trim());
      setPathAddValue("");
      setPathDescValue("");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Paths</h1>

      {/* Quick Add Path */}
      <div className="space-y-2">
        <Input
          placeholder="Path title..."
          value={pathAddValue}
          onChange={(e) => setPathAddValue(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && !e.shiftKey && handlePathAdd()
          }
        />
        <div className="flex space-x-2">
          <Input
            placeholder="Description (optional)..."
            value={pathDescValue}
            onChange={(e) => setPathDescValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePathAdd()}
            className="flex-1"
          />
          <Button onClick={handlePathAdd} disabled={!pathAddValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Paths Grid */}
      {paths && paths.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paths?.map((path: Path) => (
            <Card
              key={path._id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4">
                {editingPath === path._id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Path title"
                      value={editPathForm.title}
                      onChange={(e) =>
                        setEditPathForm({
                          ...editPathForm,
                          title: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={editPathForm.description}
                      onChange={(e) =>
                        setEditPathForm({
                          ...editPathForm,
                          description: e.target.value,
                        })
                      }
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updatePath(
                            path._id,
                            editPathForm.title,
                            editPathForm.description
                          )
                        }
                        disabled={!editPathForm.title.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditPath}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between h-fit">
                      <div className="flex flex-col flex-1 h-full">
                        <h3 className="font-medium">{path.title}</h3>
                        {path.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {path.description}
                          </p>
                        )}
                        {(() => {
                          const stats = getPathStats(path._id);
                          return (
                            <div className="flex items-center space-x-3 mt-auto pt-2 text-xs text-muted-foreground">
                              <span>{stats.completed} completed</span>
                              <span>•</span>
                              <span className="text-destructive">{stats.failed} failed</span>
                              <span>•</span>
                              <span>
                                {stats.incomplete} in progress
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditPath(path)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePath(path._id)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No paths yet</p>
          <p className="text-sm mt-1">Create a path to get started</p>
        </div>
      )}
    </div>
  );
}
