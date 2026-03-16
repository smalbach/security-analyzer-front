import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '../../lib/cn';

interface DroppableGroupZoneProps {
  groupId: string;
  itemIds: string[];
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a group's flow list as a droppable zone + sortable context.
 * Flows can be dropped here from other groups or from ungrouped flows.
 */
export function DroppableGroupZone({
  groupId,
  itemIds,
  disabled = false,
  children,
}: DroppableGroupZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-group-${groupId}`,
    data: { type: 'group', groupId },
    disabled,
  });

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy} disabled={disabled}>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[32px] rounded transition-colors',
          isOver && !disabled && 'bg-sky-500/10 ring-1 ring-sky-500/30',
        )}
      >
        {children}
        {isOver && !disabled && itemIds.length === 0 && (
          <div className="py-2 text-center text-[10px] text-sky-400">
            Drop flow here
          </div>
        )}
      </div>
    </SortableContext>
  );
}
