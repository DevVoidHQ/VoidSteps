import { memo, useMemo, useCallback, useState } from "react";
import {
  DndContext,
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Step, Path } from "@/types/index";
import { StepCard } from "./StepCard";
import type { StepCardProps } from "./StepCard";

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
  const { listeners, setNodeRef, transform, transition } = useSortable({
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
        <StepCard step={step} {...props} />
      </div>
    );
  }

  // The whole card is the drag target; the 8px activation distance keeps plain
  // clicks on its controls working. Pointer events from the card's portaled
  // dialog and menu still bubble here through React, so only presses that
  // start inside the card itself may begin a drag.
  const onPointerDown = listeners?.onPointerDown;
  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={(event) => {
        if (event.currentTarget.contains(event.target as Node)) onPointerDown?.(event);
      }}
    >
      <StepCard step={step} {...props} />
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
}: DraggableStepListProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    // Pointer only. With the card as the drag target, a keyboard sensor would
    // start a drag whenever Space or Enter is pressed on any control inside it.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
