import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { buttonStyles } from '../ui/buttonStyles';
import { InlineEditableName } from './InlineEditableName';
import { DraggableFlowItem } from './DraggableFlowItem';
import { DroppableGroupZone } from './DroppableGroupZone';
import type {
  FlowGroup,
  FlowGroupItem,
  FlowExecutionSummary,
} from '../../types/flow';

// ─── Status Helpers ────────────────────────────────────────────────────

function getHealthColor(status?: string): string {
  if (!status) return 'border-l-slate-600';
  switch (status) {
    case 'completed':
      return 'border-l-emerald-500';
    case 'completed_with_warnings':
      return 'border-l-yellow-500';
    case 'failed':
      return 'border-l-rose-500';
    case 'running':
      return 'border-l-sky-500';
    case 'pending':
      return 'border-l-slate-400';
    case 'cancelled':
      return 'border-l-orange-500';
    default:
      return 'border-l-slate-600';
  }
}

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'completed':
      return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Passed' };
    case 'completed_with_warnings':
      return { bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', label: 'Warnings' };
    case 'failed':
      return { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', label: 'Failed' };
    case 'running':
      return { bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400', label: 'Running' };
    case 'cancelled':
      return { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', label: 'Cancelled' };
    default:
      return { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', label: status };
  }
}

function getFlowStatusDot(status?: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-400';
    case 'completed_with_warnings':
      return 'bg-yellow-400';
    case 'failed':
      return 'bg-rose-400';
    case 'running':
      return 'bg-sky-400 animate-pulse';
    default:
      return 'bg-slate-600';
  }
}

// ─── Props ─────────────────────────────────────────────────────────────

interface FlowGroupCardProps {
  group: FlowGroup;
  projectId: string;
  isRunning: boolean;
  currentFlowIndex: number;
  currentFlowName: string;
  completedFlows: number;
  totalFlowsRunning: number;
  flowResults: Array<{ flowId: string; status: string; summary: FlowExecutionSummary | null }>;
  onUpdateGroupName: (groupId: string, name: string) => Promise<void>;
  onUpdateFlowName: (flowId: string, name: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => void;
  onRunGroup: (groupId: string) => void;
  onCancelGroup: (groupId: string) => void;
  onRemoveFlow: (groupId: string, flowId: string) => void;
  onMoveFlow: (groupId: string, flowId: string, direction: 'up' | 'down') => void;
}

export function FlowGroupCard({
  group,
  projectId,
  isRunning,
  currentFlowIndex,
  currentFlowName,
  completedFlows,
  totalFlowsRunning,
  flowResults,
  onUpdateGroupName,
  onUpdateFlowName,
  onDeleteGroup,
  onRunGroup,
  onCancelGroup,
  onRemoveFlow,
  onMoveFlow,
}: FlowGroupCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const lastExec = group.lastExecution;
  const healthColor = getHealthColor(lastExec?.status);
  const items = [...(group.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasFlows = items.length > 0;

  // Globally unique sortable IDs for @dnd-kit
  const sortableItemIds = items.map((item) => `group-${group.id}-${item.flowId}`);

  const progressPercent = isRunning && totalFlowsRunning > 0
    ? Math.round((completedFlows / totalFlowsRunning) * 100)
    : 0;

  const getFlowRunResult = useCallback(
    (flowId: string) => flowResults.find((r) => r.flowId === flowId),
    [flowResults],
  );

  const getFlowLastStatus = useCallback(
    (flowId: string): string | undefined => {
      // During execution, use live results
      const live = getFlowRunResult(flowId);
      if (live) return live.status;
      // Otherwise check last group execution summary
      if (!lastExec?.summary?.flowResults) return undefined;
      const fr = lastExec.summary.flowResults.find((r) => r.flowId === flowId);
      return fr?.status;
    },
    [getFlowRunResult, lastExec],
  );

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 border-white/10 bg-[rgba(var(--bg-800),0.45)] transition',
        healthColor,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 transition hover:text-slate-300"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Group name (inline editable) */}
        <InlineEditableName
          value={group.name}
          onSave={(name) => onUpdateGroupName(group.id, name)}
          className="text-sm font-medium text-slate-100"
          disabled={isRunning}
        />

        {/* Status badge */}
        {lastExec && (
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
              getStatusBadge(lastExec.status).bg,
              getStatusBadge(lastExec.status).text,
            )}
          >
            {getStatusBadge(lastExec.status).label}
          </span>
        )}

        {/* Flow count */}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
          {items.length} flow{items.length !== 1 ? 's' : ''}
        </span>

        <div className="flex-1" />

        {/* Run / Cancel button */}
        {isRunning ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelGroup(group.id);
            }}
            className={buttonStyles({ variant: 'danger', size: 'xs' })}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRunGroup(group.id);
            }}
            disabled={!hasFlows}
            className={buttonStyles({ variant: 'primary', size: 'xs' })}
            title={hasFlows ? 'Run all flows in this group' : 'Add flows to run'}
          >
            ▶ Run
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteGroup(group.id);
          }}
          disabled={isRunning}
          className={buttonStyles({ variant: 'ghost', size: 'xs' })}
          title="Delete group"
        >
          ✕
        </button>
      </div>

      {/* Progress bar during execution */}
      {isRunning && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>
              Running flow {currentFlowIndex + 1}/{totalFlowsRunning}: {currentFlowName}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded flow list with drag-and-drop */}
      {expanded && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2">
          <DroppableGroupZone
            groupId={group.id}
            itemIds={sortableItemIds}
            disabled={isRunning}
          >
            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-600">
                Drag flows here or click "+ Add flow" below
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <DraggableFlowItem
                    key={item.id}
                    id={`group-${group.id}-${item.flowId}`}
                    disabled={isRunning}
                  >
                    <FlowItemRow
                      item={item}
                      index={idx}
                      totalItems={items.length}
                      projectId={projectId}
                      flowStatus={getFlowLastStatus(item.flowId)}
                      isGroupRunning={isRunning}
                      isCurrentlyRunning={isRunning && currentFlowIndex === idx}
                      onUpdateName={onUpdateFlowName}
                      onRemove={() => onRemoveFlow(group.id, item.flowId)}
                      onMove={(dir) => onMoveFlow(group.id, item.flowId, dir)}
                      onNavigate={() => navigate(`/projects/${projectId}/flows/${item.flowId}`)}
                    />
                  </DraggableFlowItem>
                ))}
              </div>
            )}
          </DroppableGroupZone>
        </div>
      )}
    </div>
  );
}

// ─── Flow Item Row ─────────────────────────────────────────────────────

interface FlowItemRowProps {
  item: FlowGroupItem;
  index: number;
  totalItems: number;
  projectId: string;
  flowStatus?: string;
  isGroupRunning: boolean;
  isCurrentlyRunning: boolean;
  onUpdateName: (flowId: string, name: string) => Promise<void>;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onNavigate: () => void;
}

function FlowItemRow({
  item,
  index,
  totalItems,
  flowStatus,
  isGroupRunning,
  isCurrentlyRunning,
  onUpdateName,
  onRemove,
  onMove,
  onNavigate,
}: FlowItemRowProps) {
  const flowName = item.flow?.name || 'Unknown';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition',
        isCurrentlyRunning
          ? 'bg-sky-500/10 border border-sky-500/20'
          : 'hover:bg-white/5',
      )}
    >
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          disabled={index === 0 || isGroupRunning}
          onClick={(e) => {
            e.stopPropagation();
            onMove('up');
          }}
          className="text-slate-600 transition hover:text-slate-300 disabled:opacity-30"
          title="Move up"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={index === totalItems - 1 || isGroupRunning}
          onClick={(e) => {
            e.stopPropagation();
            onMove('down');
          }}
          className="text-slate-600 transition hover:text-slate-300 disabled:opacity-30"
          title="Move down"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Status dot */}
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', getFlowStatusDot(flowStatus))}
        title={flowStatus || 'Not run'}
      />

      {/* Flow name (inline editable) */}
      <InlineEditableName
        value={flowName}
        onSave={(name) => onUpdateName(item.flowId, name)}
        className="min-w-0 flex-1 truncate text-slate-200"
        disabled={isGroupRunning}
      />

      {/* Running indicator */}
      {isCurrentlyRunning && (
        <span className="shrink-0 text-[10px] text-sky-400 animate-pulse">
          executing...
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="text-slate-600 transition hover:text-slate-300"
          title="Open flow builder"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isGroupRunning}
          className="text-slate-600 transition hover:text-rose-400 disabled:opacity-30"
          title="Remove from group"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
