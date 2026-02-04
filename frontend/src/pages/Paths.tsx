import { useState, useMemo } from "react";
import type { Step, Path } from "@/types/index";
import {
  useCreatePath,
  useUpdatePath,
  useDeletePath,
} from "@/lib/convex-hooks";
import { useData } from "@/contexts/DataContext";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import {
  Plus,
  X,
  Target,
  Pencil,
  ChevronRight,
} from "lucide-react";

export default function Paths() {
  const { paths, allSteps } = useData();

  const createPathMutation = useCreatePath();
  const updatePathMutation = useUpdatePath();
  const deletePathMutation = useDeletePath();

  const [pathAddValue, setPathAddValue] = useState("");
  const [pathDescValue, setPathDescValue] = useState("");
  const [pathParentIdValue, setPathParentIdValue] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editPathForm, setEditPathForm] = useState({
    title: "",
    description: "",
    parentId: "",
  });

  // Build hierarchical structure
  const { flattenedPaths, childMap } = useMemo(() => {
    if (!paths) return { flattenedPaths: [], childMap: new Map() };

    const childMap = new Map<string | null, Path[]>();

    // Group paths by parentId
    paths.forEach((path) => {
      const parentId = path.parentId || null;
      if (!childMap.has(parentId)) {
        childMap.set(parentId, []);
      }
      childMap.get(parentId)!.push(path);
    });

    // Flatten with depth info
    const result: { path: Path; depth: number }[] = [];

    const addPathWithChildren = (path: Path, depth: number) => {
      result.push({ path, depth });
      const children = childMap.get(path._id) || [];
      children.forEach((child) => addPathWithChildren(child, depth + 1));
    };

    const rootPaths = childMap.get(null) || [];
    rootPaths.forEach((path) => addPathWithChildren(path, 0));

    return { flattenedPaths: result, childMap };
  }, [paths]);

  const createPath = async (title: string, description?: string, parentId?: string) => {
    try {
      await createPathMutation({
        title,
        description: description || undefined,
        parentId: parentId ? (parentId as Id<"paths">) : undefined,
      });
    } catch (error) {
      console.error("Error creating path:", error);
    }
  };

  const updatePath = async (id: string, title: string, description: string, parentId: string) => {
    try {
      await updatePathMutation({
        id: id as Id<"paths">,
        title,
        description: description || undefined,
        parentId: parentId ? (parentId as Id<"paths">) : null,
      });
      setEditingPath(null);
    } catch (error) {
      console.error("Error updating path:", error);
    }
  };

  const startEditPath = (path: Path) => {
    setEditingPath(path._id);
    setEditPathForm({
      title: path.title,
      description: path.description || "",
      parentId: path.parentId || "",
    });
  };

  const cancelEditPath = () => {
    setEditingPath(null);
    setEditPathForm({ title: "", description: "", parentId: "" });
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

  const getChildPathsCount = (pathId: string) => {
    return (childMap.get(pathId) || []).length;
  };

  // Get parent options excluding a path and its descendants
  const getParentOptions = (excludeId?: string) => {
    if (!excludeId) return flattenedPaths;

    // Get all descendant IDs to exclude
    const excludeIds = new Set<string>([excludeId]);
    const addDescendants = (id: string) => {
      const children = childMap.get(id) || [];
      children.forEach((child: Path) => {
        excludeIds.add(child._id);
        addDescendants(child._id);
      });
    };
    addDescendants(excludeId);

    return flattenedPaths.filter((item) => !excludeIds.has(item.path._id));
  };

  const handlePathAdd = () => {
    if (pathAddValue.trim()) {
      createPath(pathAddValue.trim(), pathDescValue.trim(), pathParentIdValue);
      setPathAddValue("");
      setPathDescValue("");
      setPathParentIdValue("");
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
            className="flex-1 min-w-0"
          />
          <select
            value={pathParentIdValue}
            onChange={(e) => setPathParentIdValue(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-md text-sm"
          >
            <option value="">Root (no parent)</option>
            {flattenedPaths.map(({ path, depth }) => (
              <option key={path._id} value={path._id}>
                {"  ".repeat(depth)}
                {depth > 0 && "└ "}
                {path.title}
              </option>
            ))}
          </select>
          <Button onClick={handlePathAdd} disabled={!pathAddValue.trim()} className="flex-shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Paths Grid */}
      {paths && paths.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flattenedPaths.map(({ path, depth }) => {
            const stats = getPathStats(path._id);
            const childCount = getChildPathsCount(path._id);

            return (
              <Card
                key={path._id}
                className="hover:border-primary/50 transition-colors"
                style={{ marginLeft: `${depth * 16}px` }}
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
                      <select
                        value={editPathForm.parentId}
                        onChange={(e) =>
                          setEditPathForm({
                            ...editPathForm,
                            parentId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                      >
                        <option value="">Root (no parent)</option>
                        {getParentOptions(path._id).map(({ path: p, depth: d }) => (
                          <option key={p._id} value={p._id}>
                            {"  ".repeat(d)}
                            {d > 0 && "└ "}
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updatePath(
                              path._id,
                              editPathForm.title,
                              editPathForm.description,
                              editPathForm.parentId
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
                          <div className="flex items-center gap-2">
                            {depth > 0 && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <h3 className="font-medium">{path.title}</h3>
                          </div>
                          {path.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {path.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-3 mt-auto pt-2 text-xs text-muted-foreground">
                            <span>{stats.completed} completed</span>
                            <span>•</span>
                            <span className="text-destructive">{stats.failed} failed</span>
                            <span>•</span>
                            <span>{stats.incomplete} in progress</span>
                            {childCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{childCount} child path{childCount > 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
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
            );
          })}
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
