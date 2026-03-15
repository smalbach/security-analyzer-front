import { useCallback } from 'react';
import { HelpTooltip } from '../ui/HelpTooltip';
import { useDnD } from './DnDContext';
import type { FlowNodeType } from '../../types/flow';

interface PaletteItem {
  type: FlowNodeType;
  label: string;
  description: string;
  colorClass: string;
  dotClass: string;
  category: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'auth', label: 'Auth', description: 'Login & extract token', colorClass: 'border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]', dotClass: 'bg-emerald-400', category: 'Authentication' },
  { type: 'request', label: 'Request', description: 'HTTP API call', colorClass: 'border-sky-500/20 bg-sky-500/[0.07] hover:bg-sky-500/[0.12]', dotClass: 'bg-sky-400', category: 'HTTP' },
  { type: 'condition', label: 'Condition', description: 'IF/ELSE branching', colorClass: 'border-amber-500/20 bg-amber-500/[0.07] hover:bg-amber-500/[0.12]', dotClass: 'bg-amber-400', category: 'Logic' },
  { type: 'loop', label: 'Loop', description: 'Iterate over array', colorClass: 'border-violet-500/20 bg-violet-500/[0.07] hover:bg-violet-500/[0.12]', dotClass: 'bg-violet-400', category: 'Logic' },
  { type: 'merge', label: 'Merge', description: 'Wait for branches', colorClass: 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]', dotClass: 'bg-slate-400', category: 'Logic' },
  { type: 'delay', label: 'Delay', description: 'Wait before next', colorClass: 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]', dotClass: 'bg-slate-400', category: 'Utilities' },
  { type: 'script', label: 'Script', description: 'Custom JS code', colorClass: 'border-orange-500/20 bg-orange-500/[0.07] hover:bg-orange-500/[0.12]', dotClass: 'bg-orange-400', category: 'Utilities' },
];

const CATEGORIES = [...new Set(PALETTE_ITEMS.map((i) => i.category))];

interface FlowNodePaletteProps {
  onAddNode: (type: FlowNodeType) => void;
}

export function FlowNodePalette({ onAddNode }: FlowNodePaletteProps) {
  const [, setDragType] = useDnD();

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, nodeType: FlowNodeType) => {
    // Set type in React Context (reliable, avoids browser DnD security restrictions)
    setDragType(nodeType);
    // Also set dataTransfer as fallback
    event.dataTransfer.setData('application/flow-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, [setDragType]);

  return (
    <div className="flex w-[200px] flex-col gap-3 overflow-y-auto border-r border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.5)] p-3 backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Nodes
        </span>
        <HelpTooltip content="Drag nodes onto the canvas or click to add. Connect nodes by dragging from a source handle (right) to a target handle (left)." position="right" />
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat}>
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
            {cat}
          </div>
          <div className="flex flex-col gap-1">
            {PALETTE_ITEMS.filter((i) => i.category === cat).map((item) => (
              <div
                key={item.type}
                role="button"
                tabIndex={0}
                onClick={() => onAddNode(item.type)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAddNode(item.type); }}
                draggable
                onDragStart={(e) => handleDragStart(e, item.type)}
                className={`flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition active:cursor-grabbing ${item.colorClass}`}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200">{item.label}</div>
                  <div className="truncate text-[10px] text-slate-400">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
