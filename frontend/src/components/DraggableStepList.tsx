import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Step, Path } from "@/types/index";
import { StepCard } from "./StepCard";
import type { StepCardProps } from "./StepCard";
import { GripVertical } from "lucide-react";

interface DraggableStepListProps {
  steps: Step[];
  paths: Path[];
  onReorder: (stepIds: string[]) => void;
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  editingStep: string | null;
  editForm: { title: string; description: string; pathId: string };
  onStartEdit: (step: Step) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onEditFormChange: (updates: Partial<{ title: string; description: string; pathId: string }>) => void;
}

interface SortableStepItemProps extends Omit<StepCardProps, 'step'> {
  step: Step;
  isDragging?: boolean;
}

function SortableStepItem({ step, isDragging, ...props }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="flex items-center space-x-2">
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <StepCard step={step} {...props} />
        </div>
      </div>
    </div>
  );
}

export function DraggableStepList({
  steps,
  paths,
  onReorder,
  onToggle,
  onToggleFailed,
  onDelete,
  onTogglePriority,
  editingStep,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
}: DraggableStepListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex(step => step._id === active.id);
      const newIndex = steps.findIndex(step => step._id === over.id);

      const reorderedSteps = arrayMove(steps, oldIndex, newIndex);
      const stepIds = reorderedSteps.map(step => step._id);

      onReorder(stepIds);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map(step => step._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {steps.map((step) => (
            <SortableStepItem
              key={step._id}
              step={step}
              paths={paths}
              onToggle={onToggle}
              onToggleFailed={onToggleFailed}
              onDelete={onDelete}
              onTogglePriority={onTogglePriority}
              isEditing={editingStep === step._id}
              editForm={editForm}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onEditFormChange={onEditFormChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
