import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, ConditionNodeConfig } from '../../../types/flow';

export function ConditionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as ConditionNodeConfig;

  return (
    <BaseNodeWrapper
      nodeType="condition"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
      hideDefaultSource
      sourceHandles={[
        { id: 'true', label: 'TRUE', color: '#22c55e' },
        { id: 'false', label: 'FALSE', position: 'bottom', color: '#ef4444' },
      ]}
    >
      {config?.expression ? (
        <div className="font-mono truncate">
          {config.expression} {config.operator} {config.value}
        </div>
      ) : (
        <div className="opacity-50 italic">Configure condition</div>
      )}
      <div className="flex justify-between mt-1 text-[9px]">
        <span style={{ color: '#22c55e' }}>TRUE &rarr;</span>
        <span style={{ color: '#ef4444' }}>FALSE &darr;</span>
      </div>
    </BaseNodeWrapper>
  );
}
