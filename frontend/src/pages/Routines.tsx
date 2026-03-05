import { useState, useCallback } from "react";
import type { Routine, Path } from "@/types/index";
import { useCreateRoutine, useUpdateRoutine, useDeleteRoutine, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/local-mutations";
import { useData } from "@/contexts/DataContext";
import { reportError } from "@/lib/error-store";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Plus,
  X,
  Star,
  Target,
  Pencil,
  Repeat,
  Calendar,
  Check,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type Frequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function formatSchedule(routine: Routine): string {
  switch (routine.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays (Mon-Fri)';
    case 'weekly': {
      if (!routine.daysOfWeek || routine.daysOfWeek.length === 0) {
        return 'Weekly';
      }
      const days = routine.daysOfWeek
        .sort((a, b) => a - b)
        .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
        .join(', ');
      return `Every ${days}`;
    }
    case 'monthly': {
      const day = routine.dayOfMonth || 1;
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      return `Monthly on the ${day}${suffix}`;
    }
    case 'yearly': {
      const month = routine.month || 1;
      const day = routine.dayOfYear || 1;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `Yearly on ${monthNames[month - 1]} ${day}`;
    }
    default:
      return '';
  }
}

function formatNextOccurrence(timestamp: number | string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

interface RoutineFormData {
  title: string;
  description: string;
  pathId: string;
  frequency: Frequency;
  daysOfWeek: number[];
  dayOfMonth: number;
  month: number;
  dayOfYear: number;
  autoPrioritize: boolean;
}

const defaultFormData: RoutineFormData = {
  title: '',
  description: '',
  pathId: '',
  frequency: 'daily',
  daysOfWeek: [1], // Monday by default
  dayOfMonth: 1,
  month: 1,
  dayOfYear: 1,
  autoPrioritize: true,
};

export default function Routines() {
  const toast = useToast();
  const { paths, routines } = useData();

  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const deleteRoutineMutation = useDeleteRoutine();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoutineFormData>(defaultFormData);

  const resetForm = useCallback(() => {
    setFormData(defaultFormData);
    setIsCreating(false);
    setEditingId(null);
  }, []);

  const startEditing = useCallback((routine: Routine) => {
    setEditingId(routine._id);
    setIsCreating(false);
    setFormData({
      title: routine.title,
      description: routine.description || '',
      pathId: routine.path?._id || (typeof routine.pathId === 'string' ? routine.pathId : '') || '',
      frequency: routine.frequency,
      daysOfWeek: routine.daysOfWeek || [1],
      dayOfMonth: routine.dayOfMonth || 1,
      month: routine.month || 1,
      dayOfYear: routine.dayOfYear || 1,
      autoPrioritize: routine.autoPrioritize ?? true,
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formData.title.trim()) return;

    try {
      await createRoutineMutation({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        pathId: formData.pathId || undefined,
        frequency: formData.frequency,
        daysOfWeek: formData.frequency === 'weekly' ? formData.daysOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        month: formData.frequency === 'yearly' ? formData.month : undefined,
        dayOfYear: formData.frequency === 'yearly' ? formData.dayOfYear : undefined,
        autoPrioritize: formData.autoPrioritize,
      });
      resetForm();
    } catch (error) {
      reportError('mutation', error, { action: 'createRoutine' });
      toast.error("Failed to create routine");
    }
  }, [formData, createRoutineMutation, resetForm, toast]);

  const handleUpdate = useCallback(async () => {
    if (!editingId || !formData.title.trim()) return;

    try {
      await updateRoutineMutation({
        id: editingId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        pathId: formData.pathId || null,
        frequency: formData.frequency,
        daysOfWeek: formData.frequency === 'weekly' ? formData.daysOfWeek : null,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : null,
        month: formData.frequency === 'yearly' ? formData.month : null,
        dayOfYear: formData.frequency === 'yearly' ? formData.dayOfYear : null,
        autoPrioritize: formData.autoPrioritize,
      });
      resetForm();
    } catch (error) {
      reportError('mutation', error, { action: 'updateRoutine', routineId: editingId });
      toast.error("Failed to update routine");
    }
  }, [editingId, formData, updateRoutineMutation, resetForm, toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRoutineMutation({ id });
    } catch (error) {
      reportError('mutation', error, { action: 'deleteRoutine', routineId: id });
      toast.error("Failed to delete routine");
    }
  }, [deleteRoutineMutation, toast]);

  const toggleDayOfWeek = useCallback((day: number) => {
    setFormData(prev => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day];
      // Ensure at least one day is selected
      return { ...prev, daysOfWeek: newDays.length > 0 ? newDays : prev.daysOfWeek };
    });
  }, []);

  const renderForm = () => (
    <Card className="border-primary">
      <CardContent className="p-4 space-y-4">
        <Input
          placeholder="Routine title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          autoFocus
          maxLength={MAX_TITLE_LENGTH}
        />
        <Textarea
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={formData.pathId}
          onChange={(e) => setFormData(prev => ({ ...prev, pathId: e.target.value }))}
        >
          <option value="">No Path</option>
          {paths?.map((path: Path) => (
            <option key={path._id} value={path._id}>
              {path.title}
            </option>
          ))}
        </select>

        {/* Frequency selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Frequency</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as Frequency }))}
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays (Mon-Fri)</option>
            <option value="weekly">Weekly (specific days)</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Weekly: Day selection */}
        {formData.frequency === 'weekly' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    formData.daysOfWeek.includes(day.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly: Day of month */}
        {formData.frequency === 'monthly' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Day of Month</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.dayOfMonth}
              onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        )}

        {/* Yearly: Month and day */}
        {formData.frequency === 'yearly' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Day</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.dayOfYear}
                onChange={(e) => setFormData(prev => ({ ...prev, dayOfYear: Number(e.target.value) }))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Priority toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.autoPrioritize}
            onChange={(e) => setFormData(prev => ({ ...prev, autoPrioritize: e.target.checked }))}
            className="rounded border-input"
          />
          <Star className={`w-4 h-4 ${formData.autoPrioritize ? 'fill-primary text-primary' : ''}`} />
          <span className="text-sm">Add to Today's Focus when spawned</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={editingId ? handleUpdate : handleCreate} disabled={!formData.title.trim()}>
            <Check className="w-4 h-4 mr-2" />
            {editingId ? 'Save' : 'Create'}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Routines</h1>
        {!isCreating && !editingId && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Routine
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && renderForm()}

      {/* Routines List */}
      {routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((routine: Routine) => (
            <Card
              key={routine._id}
              className={`hover:border-primary/50 transition-colors ${editingId === routine._id ? 'hidden' : ''}`}
            >
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
                        <span>
                          Next: {formatNextOccurrence(routine.nextOccurrence)}
                        </span>
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
                      onClick={() => startEditing(routine)}
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
      ) : !isCreating && (
        <EmptyState
          icon={Repeat}
          message="No routines yet"
          hint="Create a recurring task to get started"
        />
      )}
    </div>
  );
}
