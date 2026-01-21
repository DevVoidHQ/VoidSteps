import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Path, Routine, StepTemplate } from "@/types/index";
import { useDeleteRoutine } from "@/lib/convex-hooks";
import { useData } from "@/contexts/DataContext";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Card, CardContent } from "@devvoid/ui";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Target,
  Pencil,
  Zap,
} from "lucide-react";

export default function Routines() {
  const navigate = useNavigate();
  const { paths, routines } = useData();

  const deleteRoutineMutation = useDeleteRoutine();

  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    new Set()
  );

  const deleteRoutine = async (id: string) => {
    await deleteRoutineMutation({ id: id as Id<"routines"> });
  };

  const toggleRoutineExpanded = (routineId: string) => {
    const newExpanded = new Set(expandedRoutines);
    if (newExpanded.has(routineId)) {
      newExpanded.delete(routineId);
    } else {
      newExpanded.add(routineId);
    }
    setExpandedRoutines(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Routines</h1>
        <Button onClick={() => navigate("/routines/new")} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Routine
        </Button>
      </div>

      {/* Routines Grid */}
      {routines && routines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {routines?.map((routine: Routine) => (
            <Card
              key={routine._id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {routine.stepTemplates.length > 0 && (
                        <button
                          onClick={() => toggleRoutineExpanded(routine._id)}
                          className="flex-shrink-0"
                        >
                          {expandedRoutines.has(routine._id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <h3 className="font-medium">{routine.title}</h3>
                    </div>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {routine.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {routine.stepTemplates.length} step
                      {routine.stepTemplates.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/routines/${routine._id}`)}
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRoutine(routine._id)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedRoutines.has(routine._id) &&
                  routine.stepTemplates.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Steps in Routine:
                      </p>
                      {routine.stepTemplates.map(
                        (template: StepTemplate, index: number) => (
                          <div key={index} className="space-y-1 pl-6">
                            <div className="flex items-start space-x-2 text-sm">
                              <span className="text-muted-foreground">
                                {index + 1}.
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <p>{template.title}</p>
                                  {template.prioritizedToday && (
                                    <Star className="w-3 h-3 fill-primary text-primary" />
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {template.description}
                                  </p>
                                )}
                                {template.pathId && (
                                  <p className="text-xs text-primary flex items-center mt-1">
                                    <Target className="w-3 h-3 mr-1" />
                                    {paths?.find(
                                      (p: Path) => p._id === template.pathId
                                    )?.title || "Unknown Path"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No routines yet</p>
          <p className="text-sm mt-1">Create a routine to get started</p>
        </div>
      )}
    </div>
  );
}
