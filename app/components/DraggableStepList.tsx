import { memo, useMemo, useCallback, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Step, Path } from "@/types/index";
import { StepCard } from "./StepCard";
import type { StepCardProps } from "./StepCard";
import { GripVertical } from "lucide-react";

interface DraggableStepListProps {
  steps: Step[];
  paths: Path[];
  routines?: unknown[]; // Kept for backward compat but not used
  onReorder: (stepIds: string[]) => void;
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  // Show start date badge on cards (for upcoming section)
  showStartDateBadge?: boolean;
  // Timer props
  onToggleTimer?: (id: string) => void;
  onSetTotalTime?: (id: string, totalTimeMs: number) => void;
  clickAction?: StepCardProps["clickAction"];
}

interface SortableStepItemProps extends StepCardProps {
  isDragging?: boolean;
  isOverlay?: boolean;
}

const SortableStepItem = memo(function SortableStepItem({
  step,
  isDragging,
  isOverlay,
  ...props
}: SortableStepItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: step._id,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    }),
    [transform, transition, isDragging]
  );

  if (isOverlay) {
    return (
      <div className="opacity-90 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 p-2 text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <StepCard step={step} {...props} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="flex items-center space-x-2">
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <StepCard step={step} {...props} />
        </div>
      </div>
    </div>
  );
});

export function DraggableStepList({
  steps,
  paths,
  routines,
  onReorder,
  onToggle,
  onToggleFailed,
  onDelete,
  onTogglePriority,
  onSaveEdit,
  showStartDateBadge,
  onToggleTimer,
  onSetTotalTime,
  clickAction,
}: DraggableStepListProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = steps.findIndex((s) => s._id === active.id);
      const newIndex = steps.findIndex((s) => s._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(steps, oldIndex, newIndex);
      onReorder(reordered.map((s) => s._id));
    },
    [steps, onReorder]
  );

  const ids = useMemo(() => steps.map((s) => s._id), [steps]);
  const activeStep = activeId ? steps.find((s) => s._id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {steps.map((step) => (
            <SortableStepItem
              key={step._id}
              step={step}
              paths={paths}
              routines={routines}
              onToggle={onToggle}
              onToggleFailed={onToggleFailed}
              onDelete={onDelete}
              onTogglePriority={onTogglePriority}
              onSaveEdit={onSaveEdit}
              isDragging={activeId === step._id}
              showStartDateBadge={showStartDateBadge}
              onToggleTimer={onToggleTimer}
              onSetTotalTime={onSetTotalTime}
              clickAction={clickAction}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeStep ? (
          <SortableStepItem
            step={activeStep}
            paths={paths}
            routines={routines}
            onToggle={onToggle}
            onToggleFailed={onToggleFailed}
            onDelete={onDelete}
            onTogglePriority={onTogglePriority}
            onSaveEdit={onSaveEdit}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
