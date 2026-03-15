import { Handle, Position } from '@xyflow/react';
import { cn } from '../../../lib/cn';
import type { FlowNodeStatus, FlowNodeType } from '../../../types/flow';

interface BaseNodeWrapperProps {
  nodeType: FlowNodeType;
  label: string;
  status?: FlowNodeStatus;
  retryAttempt?: number;
  maxRetries?: number;
  durationMs?: number;
  error?: string;
  selected?: boolean;
  children?: React.ReactNode;
  sourceHandles?: Array<{ id: string; label?: string; position?: 'right' | 'bottom'; color?: string }>;
  hideDefaultSource?: boolean;
  hideDefaultTarget?: boolean;
}

export const TYPE_COLORS: Record<FlowNodeType, string> = {
  auth: 'emerald',
  request: 'sky',
  condition: 'amber',
  loop: 'violet',
  merge: 'slate',
  delay: 'slate',
  script: 'orange',
};

const TYPE_HEX: Record<FlowNodeType, string> = {
  auth: '#34d399',
  request: '#38bdf8',
  condition: '#fbbf24',
  loop: '#a78bfa',
  merge: '#94a3b8',
  delay: '#94a3b8',
  script: '#fb923c',
};

const TYPE_LABELS: Record<FlowNodeType, string> = {
  auth: 'AUTH',
  request: 'REQUEST',
  condition: 'IF',
  loop: 'LOOP',
  merge: 'MERGE',
  delay: 'DELAY',
  script: 'SCRIPT',
};

const STATUS_ICONS: Record<FlowNodeStatus, string> = {
  pending: '',
  running: '\u25B6',
  success: '\u2713',
  warning: '\u26A0',
  error: '\u2717',
  skipped: '\u2192',
  retrying: '\u21BB',
};

const STATUS_CLASSES: Record<FlowNodeStatus, string> = {
  pending: 'bg-slate-500',
  running: 'bg-sky-500 animate-pulse',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  skipped: 'bg-slate-400',
  retrying: 'bg-orange-500 animate-pulse',
};

export function BaseNodeWrapper({
  nodeType,
  label,
  status,
  retryAttempt,
  maxRetries,
  durationMs,
  error,
  selected,
  children,
  sourceHandles,
  hideDefaultSource,
  hideDefaultTarget,
}: BaseNodeWrapperProps) {
  const hex = TYPE_HEX[nodeType];

  return (
    <div
      className={cn(
        'relative rounded-xl border backdrop-blur-xl transition',
        selected
          ? `border-${TYPE_COLORS[nodeType]}-400/50 bg-${TYPE_COLORS[nodeType]}-500/[0.08]`
          : 'border-white/10 bg-[rgba(var(--bg-800),0.6)]',
      )}
      style={{ minWidth: 190, maxWidth: 260 }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ background: hex }}
      />

      {/* Status indicator */}
      {status && (
        <div
          className={cn(
            'absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg',
            STATUS_CLASSES[status],
          )}
        >
          {STATUS_ICONS[status]}
        </div>
      )}

      {/* Retry badge */}
      {retryAttempt !== undefined && maxRetries !== undefined && (
        <div className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-lg">
          {retryAttempt}/{maxRetries}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5">
        <span
          className={cn(
            'rounded border px-1.5 py-0 font-mono text-[9px] font-bold',
            `text-${TYPE_COLORS[nodeType]}-400 border-${TYPE_COLORS[nodeType]}-500/20 bg-${TYPE_COLORS[nodeType]}-500/10`,
          )}
        >
          {TYPE_LABELS[nodeType]}
        </span>
        <span className="truncate text-xs font-medium text-slate-200">
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-[11px] text-[var(--text-secondary)]">
        {children}
      </div>

      {/* Footer: duration / error */}
      {(durationMs !== undefined || error) && (
        <div className="border-t border-white/5 px-3 py-1 text-[10px]">
          {durationMs !== undefined && (
            <span className="text-slate-400">{durationMs}ms</span>
          )}
          {error && (
            <span className="block truncate text-red-400" title={error}>
              {error}
            </span>
          )}
        </div>
      )}

      {/* Handles */}
      {!hideDefaultTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-slate-400 !border-white/20"
          style={{ width: 9, height: 9 }}
        />
      )}

      {!hideDefaultSource && !sourceHandles && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: 9, height: 9, background: hex }}
        />
      )}

      {sourceHandles?.map((h) => (
        <Handle
          key={h.id}
          type="source"
          position={h.position === 'bottom' ? Position.Bottom : Position.Right}
          id={h.id}
          style={{
            background: h.color || hex,
            width: 9,
            height: 9,
          }}
        />
      ))}
    </div>
  );
}
