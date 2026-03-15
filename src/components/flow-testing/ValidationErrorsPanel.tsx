import { cn } from '../../lib/cn';
import { useFlowBuilderStore } from '../../stores/flowBuilderStore';
import type { FlowValidationError } from '../../lib/flowValidation';

interface ValidationErrorsPanelProps {
  errors: FlowValidationError[];
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  auth: 'text-emerald-400',
  request: 'text-sky-400',
  condition: 'text-amber-400',
  loop: 'text-violet-400',
  merge: 'text-slate-400',
  delay: 'text-slate-400',
  script: 'text-orange-400',
};

export function ValidationErrorsPanel({ errors, onClose }: ValidationErrorsPanelProps) {
  const { selectNode, setConfigPanelTab } = useFlowBuilderStore();

  const handleGoToNode = (error: FlowValidationError) => {
    if (!error.nodeId) return;
    selectNode(error.nodeId);
    // Navigate to the relevant tab based on the field
    if (error.field === 'connections') {
      setConfigPanelTab('config');
    } else {
      setConfigPanelTab('config');
    }
  };

  // Group errors by node
  const grouped = errors.reduce<Record<string, FlowValidationError[]>>((acc, err) => {
    const key = err.nodeId || '__flow__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(err);
    return acc;
  }, {});

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[280px] overflow-y-auto border-t-2 border-red-500/30 bg-[rgba(var(--bg-900),0.97)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400">
            ✕
          </span>
          <span className="text-xs font-semibold text-red-400">
            {errors.length} validation {errors.length === 1 ? 'error' : 'errors'} — fix before running
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          &times;
        </button>
      </div>

      {/* Errors grouped by node */}
      <div className="p-2 space-y-2">
        {Object.entries(grouped).map(([nodeId, nodeErrors]) => {
          const first = nodeErrors[0];
          return (
            <div key={nodeId} className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-2">
              {/* Node header */}
              <div className="mb-1.5 flex items-center gap-2">
                <span className={cn('text-[10px] font-bold uppercase', TYPE_COLORS[first.nodeType] || 'text-slate-400')}>
                  {first.nodeType}
                </span>
                <span className="text-xs font-medium text-slate-200">
                  {first.nodeLabel}
                </span>
                {nodeId && nodeId !== '__flow__' && (
                  <button
                    type="button"
                    onClick={() => handleGoToNode(first)}
                    className="ml-auto text-[10px] text-sky-400 transition hover:text-sky-300 hover:underline"
                  >
                    Go to node →
                  </button>
                )}
              </div>
              {/* Error list */}
              <ul className="space-y-1">
                {nodeErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px]">
                    <span className="mt-0.5 text-red-400/60">•</span>
                    <div>
                      <span className="font-mono text-[10px] text-slate-500">{err.field}:</span>{' '}
                      <span className="text-slate-300">{err.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
