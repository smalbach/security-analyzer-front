import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/cn';

interface DraggableFlowItemProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper that makes a flow item draggable/sortable using @dnd-kit.
 * Used both inside group cards (for reordering) and for ungrouped flows (drag into groups).
 */
export function DraggableFlowItem({ id, disabled = false, children }: DraggableFlowItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-40')}
      {...attributes}
    >
      <div className="flex items-center gap-1">
        {/* Drag handle */}
        {!disabled && (
          <button
            type="button"
            className="cursor-grab touch-none text-slate-600 transition hover:text-slate-400 active:cursor-grabbing"
            {...listeners}
            title="Drag to reorder or move to another group"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
