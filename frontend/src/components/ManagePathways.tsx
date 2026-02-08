import { useState } from "react";
import { Button, Input, Card, CardContent } from "@devvoid/ui";
import { Plus, Pencil } from "lucide-react";
import type { Pathway, Path } from "@/types";
import {
  useCreatePathway,
  useUpdatePathway,
  useDeletePathway,
} from "@/lib/local-mutations";
import PathSelector from "./PathSelector";

interface ManagePathwaysProps {
  pathways: Pathway[];
  paths: Path[];
}

export default function ManagePathways({
  pathways,
  paths,
}: ManagePathwaysProps) {
  const createPathwayMutation = useCreatePathway();
  const updatePathwayMutation = useUpdatePathway();
  const deletePathwayMutation = useDeletePathway();

  // Quick add form state
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [parentIdValue, setParentIdValue] = useState("");
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);

  // Edit mode state
  const [editingPathway, setEditingPathway] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    parentId: "",
    pathIds: [] as string[],
  });

  // Create pathway
  const createPathway = async () => {
    if (!titleValue.trim()) return;

    try {
      await createPathwayMutation({
        title: titleValue.trim(),
        description: descValue.trim() || undefined,
        parentId: parentIdValue || undefined,
        pathIds:
          selectedPathIds.length > 0
            ? selectedPathIds
            : undefined,
      });
      setTitleValue("");
      setDescValue("");
      setParentIdValue("");
      setSelectedPathIds([]);
    } catch (error) {
      console.error("Error creating pathway:", error);
    }
  };

  // Update pathway
  const updatePathway = async (id: string) => {
    if (!editForm.title.trim()) return;

    try {
      await updatePathwayMutation({
        id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        parentId: editForm.parentId || undefined,
        pathIds:
          editForm.pathIds.length > 0
            ? editForm.pathIds
            : undefined,
      });
      setEditingPathway(null);
    } catch (error) {
      console.error("Error updating pathway:", error);
    }
  };

  // Delete pathway
  const deletePathway = async (id: string) => {
    try {
      await deletePathwayMutation({ id });
    } catch (error) {
      console.error("Error deleting pathway:", error);
    }
  };

  // Start editing
  const startEdit = (pathway: Pathway) => {
    setEditingPathway(pathway._id);
    setEditForm({
      title: pathway.title,
      description: pathway.description || "",
      parentId: pathway.parentId || "",
      pathIds: pathway.pathIds || [],
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingPathway(null);
    setEditForm({ title: "", description: "", parentId: "", pathIds: [] });
  };

  // Toggle path in quick-add form
  const toggleQuickAddPath = (pathId: string) => {
    setSelectedPathIds((prev) =>
      prev.includes(pathId)
        ? prev.filter((id) => id !== pathId)
        : [...prev, pathId]
    );
  };

  // Toggle path in edit form
  const toggleEditPath = (pathId: string) => {
    setEditForm((prev) => ({
      ...prev,
      pathIds: prev.pathIds.includes(pathId)
        ? prev.pathIds.filter((id) => id !== pathId)
        : [...prev.pathIds, pathId],
    }));
  };

  // Get assigned paths
  const getAssignedPaths = (pathwayId: string) => {
    const pathway = pathways.find((p) => p._id === pathwayId);
    if (!pathway || !pathway.pathIds) return [];
    return paths.filter((p) => pathway.pathIds?.includes(p._id));
  };

  // Get child pathways
  const getChildPathways = (parentId: string) => {
    return pathways.filter((pw) => pw.parentId === parentId);
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Pathway */}
      <div className="space-y-2">
        <Input
          placeholder="Pathway title..."
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && !e.shiftKey && createPathway()
          }
        />
        <div className="flex space-x-2">
          <Input
            placeholder="Description (optional)..."
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && createPathway()}
            className="flex-1"
          />
          <select
            value={parentIdValue}
            onChange={(e) => setParentIdValue(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-md text-sm"
          >
            <option value="">Root</option>
            {pathways.map((pw) => (
              <option key={pw._id} value={pw._id}>
                {pw.title}
              </option>
            ))}
          </select>
          <Button onClick={createPathway} disabled={!titleValue.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <PathSelector
          paths={paths}
          selectedPathIds={selectedPathIds}
          onPathToggle={toggleQuickAddPath}
        />
      </div>

      {/* Pathways Grid */}
      {pathways && pathways.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pathways.map((pathway) => {
            const assignedPaths = getAssignedPaths(pathway._id);
            const childPathways = getChildPathways(pathway._id);

            return (
              <Card
                key={pathway._id}
                className="hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-4">
                  {editingPathway === pathway._id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <Input
                        placeholder="Pathway title"
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
                        <option value="">Root Pathway</option>
                        {pathways
                          .filter((p) => p._id !== pathway._id)
                          .map((pw) => (
                            <option key={pw._id} value={pw._id}>
                              {pw.title}
                            </option>
                          ))}
                      </select>
                      <PathSelector
                        paths={paths}
                        selectedPathIds={editForm.pathIds}
                        onPathToggle={toggleEditPath}
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => updatePathway(pathway._id)}
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
                          onClick={() => deletePathway(pathway._id)}
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
                          <h3 className="font-semibold">{pathway.title}</h3>
                          {pathway.description && (
                            <p className="text-xs text-muted-foreground">
                              {pathway.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>
                              {assignedPaths.length > 0
                                ? `${assignedPaths.length} path${
                                    assignedPaths.length > 1 ? "s" : ""
                                  }`
                                : "No paths"}
                            </span>
                            {childPathways.length > 0 && (
                              <span>
                                {childPathways.length} child pathway
                                {childPathways.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(pathway)}
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
          <p>No pathways yet</p>
          <p className="text-sm mt-1">Create a pathway to get started</p>
        </div>
      )}
    </div>
  );
}
