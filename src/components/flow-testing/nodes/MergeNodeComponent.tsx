import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, MergeNodeConfig } from '../../../types/flow';

export function MergeNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as MergeNodeConfig;

  return (
    <BaseNodeWrapper
      nodeType="merge"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
    >
      <div className="opacity-70">
        {config?.strategy === 'waitFirst' ? 'Wait for first' : 'Wait for all'}
      </div>
    </BaseNodeWrapper>
  );
}
