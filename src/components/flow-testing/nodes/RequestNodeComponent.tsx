import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, RequestNodeConfig, FlowNodeExtractor } from '../../../types/flow';

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#eab308',
  PATCH: '#f97316',
  DELETE: '#ef4444',
};

export function RequestNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as RequestNodeConfig;
  const method = (config?.method || 'GET').toUpperCase();
  const assertionCount = config?.assertions?.length || 0;
  const extractors = (config?.extractors || []) as FlowNodeExtractor[];
  const hasSchema = !!(config?.responseSchema && typeof config.responseSchema === 'object');

  return (
    <BaseNodeWrapper
      nodeType="request"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      retryAttempt={nodeData.retryAttempt}
      maxRetries={nodeData.maxRetries}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
    >
      {config?.url ? (
        <>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-1 rounded"
              style={{ color: METHOD_COLORS[method] || '#6b7280' }}
            >
              {method}
            </span>
            <span className="truncate font-mono">{config.url}</span>
          </div>
          {assertionCount > 0 && (
            <div className="mt-1 opacity-70">{assertionCount} assertion{assertionCount > 1 ? 's' : ''}</div>
          )}
        </>
      ) : (
        <div className="opacity-50 italic">Configure request URL</div>
      )}

      {/* Output badges: extractors */}
      {extractors.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {extractors.slice(0, 4).map((ext) => (
            <span key={ext.name} className="rounded bg-sky-500/15 px-1 py-0.5 text-[7px] font-medium text-sky-400">
              {ext.name}
            </span>
          ))}
          {extractors.length > 4 && (
            <span className="text-[7px] text-slate-500">+{extractors.length - 4}</span>
          )}
        </div>
      )}

      {/* Warning: schema but no extractors */}
      {hasSchema && extractors.length === 0 && (
        <div className="mt-1 text-[7px] text-amber-400/70">
          ⚠ Schema defined, no extractors
        </div>
      )}
    </BaseNodeWrapper>
  );
}
