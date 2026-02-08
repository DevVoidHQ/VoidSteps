import { useState, useMemo } from "react";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import { Plus, Pencil, ChevronRight } from "lucide-react";
import type { Path, Step } from "@/types";
import {
  useCreatePath,
  useUpdatePath,
  useDeletePath,
} from "@/lib/local-mutations";

interface ManagePathsProps {
  paths: Path[];
  steps: Step[];
}

export default function ManagePaths({ paths, steps }: ManagePathsProps) {
  const createPathMutation = useCreatePath();
  const updatePathMutation = useUpdatePath();
  const deletePathMutation = useDeletePath();

  // Quick add form state
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [parentIdValue, setParentIdValue] = useState("");
  const [selectedConnectedPathIds, setSelectedConnectedPathIds] = useState<string[]>([]);
  const [selectedConnectedStepIds, setSelectedConnectedStepIds] = useState<string[]>([]);

  // Edit mode state
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    parentId: "",
    connectedPathIds: [] as string[],
    connectedStepIds: [] as string[],
  });

  // Build hierarchical path structure
  const { rootPaths, childMap } = useMemo(() => {
    const childMap = new Map<string | null, Path[]>();

    // Group paths by parentId
    paths.forEach((path) => {
      const parentId = path.parentId || null;
      if (!childMap.has(parentId)) {
        childMap.set(parentId, []);
      }
      childMap.get(parentId)!.push(path);
    });

    const rootPaths = childMap.get(null) || [];

    return { rootPaths, childMap };
  }, [paths]);

  // Get flattened list of paths with their depths for rendering
  const flattenedPaths = useMemo(() => {
    const result: { path: Path; depth: number }[] = [];

    const addPathWithChildren = (path: Path, depth: number) => {
      result.push({ path, depth });
      const children = childMap.get(path._id) || [];
      children.forEach((child) => addPathWithChildren(child, depth + 1));
    };

    rootPaths.forEach((path) => addPathWithChildren(path, 0));
    return result;
  }, [rootPaths, childMap]);

  // Create path
  const createPath = async () => {
    if (!titleValue.trim()) return;

    try {
      await createPathMutation({
        title: titleValue.trim(),
        description: descValue.trim() || undefined,
        parentId: parentIdValue || undefined,
        connectedPathIds:
          selectedConnectedPathIds.length > 0
            ? selectedConnectedPathIds
            : undefined,
        connectedStepIds:
          selectedConnectedStepIds.length > 0
            ? selectedConnectedStepIds
            : undefined,
      });
      setTitleValue("");
      setDescValue("");
      setParentIdValue("");
      setSelectedConnectedPathIds([]);
      setSelectedConnectedStepIds([]);
    } catch (error) {
      console.error("Error creating path:", error);
    }
  };

  // Update path
  const updatePath = async (id: string) => {
    if (!editForm.title.trim()) return;

    try {
      await updatePathMutation({
        id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        parentId: editForm.parentId || null,
        connectedPathIds:
          editForm.connectedPathIds.length > 0
            ? editForm.connectedPathIds
            : undefined,
        connectedStepIds:
          editForm.connectedStepIds.length > 0
            ? editForm.connectedStepIds
            : undefined,
      });
      setEditingPath(null);
    } catch (error) {
      console.error("Error updating path:", error);
    }
  };

  // Delete path
  const deletePath = async (id: string) => {
    try {
      await deletePathMutation({ id });
    } catch (error) {
      console.error("Error deleting path:", error);
    }
  };

  // Start editing
  const startEdit = (path: Path) => {
    setEditingPath(path._id);
    setEditForm({
      title: path.title,
      description: path.description || "",
      parentId: path.parentId || "",
      connectedPathIds: path.connectedPathIds || [],
      connectedStepIds: path.connectedStepIds || [],
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingPath(null);
    setEditForm({
      title: "",
      description: "",
      parentId: "",
      connectedPathIds: [],
      connectedStepIds: [],
    });
  };

  // Get path stats
  const getPathStats = (pathId: string) => {
    const pathSteps = steps.filter((step) => {
      const stepPathId =
        step.path?._id || (typeof step.pathId === "string" ? step.pathId : null);
      return stepPathId === pathId;
    });
    return {
      total: pathSteps.length,
      completed: pathSteps.filter((s) => s.completed).length,
      failed: pathSteps.filter((s) => s.failed === true).length,
      incomplete: pathSteps.filter((s) => !s.completed && s.failed !== true)
        .length,
    };
  };

  // Get child paths count
  const getChildPathsCount = (pathId: string) => {
    return (childMap.get(pathId) || []).length;
  };

  // Build parent path options (excluding self and descendants to prevent cycles)
  const getParentOptions = (excludeId?: string) => {
    if (!excludeId) return flattenedPaths;

    // Get all descendant IDs to exclude
    const excludeIds = new Set<string>([excludeId]);
    const addDescendants = (id: string) => {
      const children = childMap.get(id) || [];
      children.forEach((child) => {
        excludeIds.add(child._id);
        addDescendants(child._id);
      });
    };
    addDescendants(excludeId);

    return flattenedPaths.filter((item) => !excludeIds.has(item.path._id));
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Path */}
      <div className="space-y-2">
        <Input
          placeholder="Path title..."
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && !e.shiftKey && createPath()
          }
        />
        <div className="flex space-x-2">
          <Input
            placeholder="Description (optional)..."
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && createPath()}
            className="flex-1"
          />
          <select
            value={parentIdValue}
            onChange={(e) => setParentIdValue(e.target.value)}
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
          <Button onClick={createPath} disabled={!titleValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Paths Grid */}
      {paths && paths.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    // Edit Mode
                    <div className="space-y-3">
                      <Input
                        placeholder="Path title"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                      />
                      <select
                        value={editForm.parentId}
                        onChange={(e) =>
                          setEditForm({ ...editForm, parentId: e.target.value })
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
                          onClick={() => updatePath(path._id)}
                          disabled={!editForm.title.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePath(path._id)}
                          className="ml-auto text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {depth > 0 && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <h3 className="font-semibold">{path.title}</h3>
                          </div>
                          {path.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {path.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>
                              {stats.completed} completed • {stats.incomplete} in
                              progress • {stats.failed} failed
                            </span>
                            {childCount > 0 && (
                              <span>
                                • {childCount} child path
                                {childCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(path)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No paths yet</p>
          <p className="text-sm mt-1">Create a path to get started</p>
        </div>
      )}
    </div>
  );
}
