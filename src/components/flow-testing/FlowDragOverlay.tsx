import { cn } from '../../lib/cn';

interface FlowDragOverlayProps {
  flowName: string;
}

/**
 * Visual overlay shown while dragging a flow item.
 */
export function FlowDragOverlay({ flowName }: FlowDragOverlayProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-sky-500/30 bg-[rgba(var(--bg-800),0.95)] px-3 py-2 shadow-xl shadow-sky-500/10',
        'cursor-grabbing',
      )}
    >
      <svg className="h-4 w-4 shrink-0 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
      <span className="truncate text-sm font-medium text-slate-100">{flowName}</span>
    </div>
  );
}
