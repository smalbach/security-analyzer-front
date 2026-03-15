import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, DelayNodeConfig } from '../../../types/flow';

export function DelayNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as DelayNodeConfig;

  return (
    <BaseNodeWrapper
      nodeType="delay"
      label={nodeData.label}
      status={nodeData.status}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
    >
      <div className="opacity-70">
        {config?.delayExpression
          ? <span className="font-mono">{config.delayExpression}</span>
          : `${config?.delayMs || 1000}ms`}
      </div>
    </BaseNodeWrapper>
  );
}
