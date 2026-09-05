import { useState, useCallback } from "react";
import type { Routine } from "@/types/index";
import { useDeleteRoutine } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, X, Star, Target, Pencil, Repeat, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import QuickCreateRoutineDialog from "@/components/QuickCreateRoutineDialog";
import { getKeybinds, formatKeybindDisplay } from "@/lib/keybind-config";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function formatSchedule(routine: Routine): string {
  switch (routine.frequency) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays (Mon-Fri)";
    case "weekly": {
      if (!routine.daysOfWeek || routine.daysOfWeek.length === 0) {
        return "Weekly";
      }
      const days = routine.daysOfWeek
        .sort((a, b) => a - b)
        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
        .join(", ");
      return `Every ${days}`;
    }
    case "monthly": {
      const day = routine.dayOfMonth || 1;
      const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
      return `Monthly on the ${day}${suffix}`;
    }
    case "yearly": {
      const month = routine.month || 1;
      const day = routine.dayOfYear || 1;
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `Yearly on ${monthNames[month - 1]} ${day}`;
    }
    default:
      return "";
  }
}

function formatNextOccurrence(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp));
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
}

export default function Routines() {
  const toast = useToast();
  const { routines } = useData();

  const deleteRoutineMutation = useDeleteRoutine();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const openCreate = useCallback(() => {
    setEditingRoutine(null);
    setIsDialogOpen(true);
  }, []);

  const openEdit = useCallback((routine: Routine) => {
    setEditingRoutine(routine);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteRoutineMutation({ id });
      } catch (error) {
        reportError("mutation", error, { action: "deleteRoutine", routineId: id });
        toast.error("Failed to delete routine");
      }
    },
    [deleteRoutineMutation, toast]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Routines</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Routine
          <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 font-mono text-[10px]">
            {formatKeybindDisplay(getKeybinds().quickCreateRoutine)}
          </kbd>
        </Button>
      </div>

      {/* Routines List */}
      {routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((routine: Routine) => (
            <Card key={routine._id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-primary flex-shrink-0" />
                      <h3 className="font-medium truncate">{routine.title}</h3>
                      {routine.autoPrioritize && (
                        <Star className="w-4 h-4 fill-primary text-primary flex-shrink-0" />
                      )}
                    </div>
                    {routine.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {routine.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatSchedule(routine)}
                      </span>
                      {routine.nextOccurrence && (
                        <span>Next: {formatNextOccurrence(routine.nextOccurrence)}</span>
                      )}
                      {routine.path && (
                        <span className="flex items-center gap-1 text-primary">
                          <Target className="w-3 h-3" />
                          {routine.path.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(routine)}
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(routine._id)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Repeat}
          message="No routines yet"
          hint="Create a recurring task to get started"
        />
      )}

      <QuickCreateRoutineDialog
        open={isDialogOpen}
        routine={editingRoutine}
        onOpenChange={(o) => {
          setIsDialogOpen(o);
          if (!o) setEditingRoutine(null);
        }}
      />
    </div>
  );
}
