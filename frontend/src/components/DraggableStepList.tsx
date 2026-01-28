import { memo, useMemo, useCallback, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Step, Path, Routine } from "@/types/index";
import { StepCard } from "./StepCard";
import type { StepCardProps } from "./StepCard";
import { GripVertical, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useStepHierarchy } from "@/hooks/useStepHierarchy";

interface DraggableStepListProps {
  steps: Step[];
  paths: Path[];
  routines?: Routine[];
  onReorder: (stepIds: string[], parentId?: string) => void;
  onToggle: (id: string) => void;
  onToggleFailed?: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string, current: boolean) => void;
  onSaveEdit: (id: string, updates: Partial<Step>) => void;
  onUpdateParent?: (stepId: string, newParentId: string | undefined) => void;
  // Controlled expand state (optional - if not provided, uses internal state)
  expandedStepIds?: Set<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  // Hide the internal expand all button when parent wants to render it
  hideExpandAllButton?: boolean;
  // Show start date badge on cards (for upcoming section)
  showStartDateBadge?: boolean;
}

interface SortableStepItemProps extends StepCardProps {
  isDragging?: boolean;
  isOverlay?: boolean;
}

// Droppable wrapper for nesting
function DroppableStepWrapper({
  id,
  children,
  isActive,
  canAcceptDrop,
}: {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
  canAcceptDrop: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${id}`,
    data: { type: 'step', stepId: id },
    disabled: !canAcceptDrop,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${
        isOver && canAcceptDrop && isActive
          ? 'scale-[1.02]'
          : ''
      }`}
    >
      {children}
    </div>
  );
}

const SortableStepItem = memo(function SortableStepItem({
  step,
  isDragging,
  isOverlay,
  ...props
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step._id });

  // Memoize style to prevent unnecessary re-renders
  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }), [transform, transition, isDragging]);

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
  onUpdateParent,
  expandedStepIds,
  onExpandedChange,
  hideExpandAllButton,
  showStartDateBadge,
}: DraggableStepListProps) {
  const [internalExpandedSteps, setInternalExpandedSteps] = useState<Set<string>>(new Set());

  // Use controlled or internal state
  const expandedSteps = expandedStepIds ?? internalExpandedSteps;

  // Wrapper to update expanded state (handles both controlled and uncontrolled)
  const updateExpandedSteps = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (onExpandedChange) {
      // Controlled mode - compute new value and call callback
      const newValue = typeof updater === 'function' ? updater(expandedSteps) : updater;
      onExpandedChange(newValue);
    } else {
      // Uncontrolled mode - use internal state setter
      setInternalExpandedSteps(updater);
    }
  }, [onExpandedChange, expandedSteps]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const { rootSteps, getChildren, getProgress, hasChildren } = useStepHierarchy(steps);

  // Compute list of step IDs that have children
  const stepsWithChildren = useMemo(() => {
    return rootSteps.filter((step) => hasChildren(step._id)).map((step) => step._id);
  }, [rootSteps, hasChildren]);

  // Check if all expandable steps are currently expanded
  const allExpanded = useMemo(() => {
    if (stepsWithChildren.length === 0) return false;
    return stepsWithChildren.every((id) => expandedSteps.has(id));
  }, [stepsWithChildren, expandedSteps]);

  // Toggle all expanded/collapsed
  const toggleAllExpanded = useCallback(() => {
    if (allExpanded) {
      updateExpandedSteps(new Set()); // Collapse all
    } else {
      updateExpandedSteps(new Set(stepsWithChildren)); // Expand all
    }
  }, [allExpanded, stepsWithChildren]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = useCallback((stepId: string) => {
    updateExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Check if we're over a droppable step (for nesting)
      const overId = String(over.id);
      if (overId.startsWith('droppable-')) {
        setOverId(overId.replace('droppable-', ''));
      } else {
        setOverId(null);
      }
    } else {
      setOverId(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeStepId = String(active.id);
    const activeStep = steps.find((s) => s._id === activeStepId);
    if (!activeStep) return;

    const overId = String(over.id);

    // Check if dropped onto a droppable step (nesting)
    if (overId.startsWith('droppable-')) {
      const targetStepId = overId.replace('droppable-', '');
      const targetStep = steps.find((s) => s._id === targetStepId);

      if (
        targetStep &&
        !targetStep.parentId && // Target must be a root step
        !activeStep.parentId && // Active must also be a root step (can't nest children of children)
        activeStepId !== targetStepId && // Can't drop on itself
        !hasChildren(activeStepId) // Can't nest a step that has children
      ) {
        // Nest the step under the target
        onUpdateParent?.(activeStepId, targetStepId);
        // Auto-expand the parent
        updateExpandedSteps((prev) => new Set([...prev, targetStepId]));
        return;
      }
    }

    // Regular reordering
    if (active.id !== over.id) {
      const overStepId = overId.startsWith('droppable-')
        ? overId.replace('droppable-', '')
        : overId;
      const overStep = steps.find((s) => s._id === overStepId);

      if (!overStep) return;

      // Determine the context (root or within a parent)
      const activeParent = activeStep.parentId;
      const overParent = overStep.parentId;

      // If both are in the same context (same parent or both root)
      if (activeParent === overParent) {
        const contextSteps =
          activeParent
            ? getChildren(activeParent)
            : rootSteps;

        const oldIndex = contextSteps.findIndex((s) => s._id === activeStepId);
        const newIndex = contextSteps.findIndex((s) => s._id === overStepId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(contextSteps, oldIndex, newIndex);
          const stepIds = reordered.map((s) => s._id);
          onReorder(stepIds, activeParent || undefined);
        }
      } else {
        // Moving between different parents
        // If active is a child being moved to root
        if (activeParent && !overParent) {
          // Promote to root
          onUpdateParent?.(activeStepId, undefined);
        }
        // If active is root being moved onto a child (this shouldn't happen with our logic)
        // The droppable logic above handles nesting
      }
    }
  }, [steps, rootSteps, getChildren, hasChildren, onReorder, onUpdateParent]);

  // Build the sortable IDs including children
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    for (const step of rootSteps) {
      ids.push(step._id);
      if (expandedSteps.has(step._id)) {
        const children = getChildren(step._id);
        for (const child of children) {
          ids.push(child._id);
        }
      }
    }
    return ids;
  }, [rootSteps, expandedSteps, getChildren]);

  const activeStep = activeId ? steps.find((s) => s._id === activeId) : null;

  // Custom collision detection that prefers droppable areas when directly over them
  const collisionDetection = useCallback(
    (args: any) => {
      // First check for pointer within collisions (more precise for droppables)
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        // Prefer droppable collisions
        const droppableCollision = pointerCollisions.find(
          (c) => String(c.id).startsWith('droppable-')
        );
        if (droppableCollision) {
          return [droppableCollision];
        }
      }
      // Fall back to rect intersection for sortable
      return rectIntersection(args);
    },
    []
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Render expand all button only if not hidden and there are expandable items */}
      {!hideExpandAllButton && stepsWithChildren.length > 0 && (
        <button
          onClick={toggleAllExpanded}
          className="flex items-center gap-1.5 px-2 py-1 mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {allExpanded ? (
            <ChevronsDownUp className="w-4 h-4" />
          ) : (
            <ChevronsUpDown className="w-4 h-4" />
          )}
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      )}
      <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rootSteps.map((step) => {
            const isExpanded = expandedSteps.has(step._id);
            const children = getChildren(step._id);
            const progress = getProgress(step._id);
            const stepHasChildren = hasChildren(step._id);
            const isDragging = activeId === step._id;
            const isDropTarget = Boolean(
              overId === step._id &&
              activeId !== step._id &&
              !step.parentId &&
              activeStep &&
              !activeStep.parentId &&
              !hasChildren(String(activeId))
            );

            return (
              <div key={step._id}>
                <DroppableStepWrapper
                  id={step._id}
                  isActive={activeId !== null}
                  canAcceptDrop={Boolean(
                    !step.parentId &&
                    activeId !== null &&
                    activeId !== step._id &&
                    activeStep &&
                    !activeStep.parentId &&
                    !hasChildren(String(activeId))
                  )}
                >
                  <SortableStepItem
                    step={step}
                    paths={paths}
                    routines={routines}
                    onToggle={onToggle}
                    onToggleFailed={onToggleFailed}
                    onDelete={onDelete}
                    onTogglePriority={onTogglePriority}
                    onSaveEdit={onSaveEdit}
                    isDragging={isDragging}
                    depth={0}
                    hasChildren={stepHasChildren}
                    isExpanded={isExpanded}
                    childProgress={progress}
                    onToggleExpand={toggleExpand}
                    isDropTarget={isDropTarget}
                    showStartDateBadge={showStartDateBadge}
                  />
                </DroppableStepWrapper>

                {/* Render children when expanded */}
                {isExpanded && children.length > 0 && (
                  <div className="ml-8 mt-2 space-y-2 border-l-2 border-muted pl-4">
                    {children.map((child) => (
                      <SortableStepItem
                        key={child._id}
                        step={child}
                        paths={paths}
                        routines={routines}
                        onToggle={onToggle}
                        onToggleFailed={onToggleFailed}
                        onDelete={onDelete}
                        onTogglePriority={onTogglePriority}
                        onSaveEdit={onSaveEdit}
                        isDragging={activeId === child._id}
                        depth={1}
                        showStartDateBadge={showStartDateBadge}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
            depth={activeStep.parentId ? 1 : 0}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
