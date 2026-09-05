import { useState, useCallback } from "react";
import type { Reminder } from "@/types/index";
import { useDeleteReminder } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import QuickCreateReminderDialog from "@/components/QuickCreateReminderDialog";
import { MONTH_LABELS as MONTH_NAMES } from "@/lib/date-utils";
import TodayRemindersBanner from "@/components/TodayRemindersBanner";
import { Plus, Bell, Pencil, Trash2, Calendar } from "lucide-react";
import { getKeybinds, formatKeybindDisplay } from "@/lib/keybind-config";


function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function describeReminder(r: Reminder): string {
  switch (r.recurrence) {
    case "once":
      return r.date
        ? new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "No date set";
    case "yearly":
      return r.month && r.day ? `Yearly on ${MONTH_NAMES[r.month - 1]} ${r.day}` : "Yearly";
    case "monthly":
      return r.day ? `Monthly on the ${ordinal(r.day)}` : "Monthly";
    default:
      return "";
  }
}

export default function Reminders() {
  const toast = useToast();
  const { reminders } = useData();
  const deleteReminder = useDeleteReminder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsDialogOpen(true);
  }, []);

  const openEdit = useCallback((r: Reminder) => {
    setEditing(r);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setConfirmDelete(null);
    try {
      await deleteReminder({ id });
    } catch (error) {
      reportError("mutation", error, { action: "deleteReminder", reminderId: id });
      toast.error("Failed to delete reminder");
    }
  }, [confirmDelete, deleteReminder, toast]);

  const sorted = [...(reminders ?? [])].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Reminder
          <kbd className="ml-2 hidden sm:inline-flex h-5 items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 font-mono text-[10px]">
            {formatKeybindDisplay(getKeybinds().quickCreateReminder)}
          </kbd>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        Birthdays, anniversaries, holidays - they show up on your calendar. No steps, no completion.
      </p>

      <TodayRemindersBanner />

      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((r) => (
            <Card key={r._id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-warning flex-shrink-0" />
                      <h3 className="font-medium truncate">{r.title}</h3>
                    </div>
                    {r.note && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.note}</p>}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {describeReminder(r)}
                    </div>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0 ml-2">
                    <IconButton
                      icon={<Pencil className="w-4 h-4" />}
                      aria-label="Edit reminder"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(r)}
                    />
                    <IconButton
                      icon={<Trash2 className="w-4 h-4" />}
                      aria-label={confirmDelete === r._id ? "Click again to delete" : "Delete reminder"}
                      title={confirmDelete === r._id ? "Click again to delete" : undefined}
                      variant="ghost"
                      size="icon-sm"
                      className={confirmDelete === r._id ? "ring-1 ring-destructive text-destructive" : undefined}
                      onClick={() => handleDelete(r._id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} message="No reminders yet" hint="Add a birthday, anniversary, or holiday" />
      )}

      <QuickCreateReminderDialog
        open={isDialogOpen}
        reminder={editing}
        onOpenChange={(o) => {
          setIsDialogOpen(o);
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}
