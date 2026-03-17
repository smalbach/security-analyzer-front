import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, LoopNodeConfig } from '../../../types/flow';

export function LoopNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as LoopNodeConfig;

  return (
    <BaseNodeWrapper
      nodeType="loop"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
      hideDefaultSource
      sourceHandles={[
        { id: 'loop-item', label: 'Each Item', color: '#a855f7' },
        { id: 'loop-done', label: 'Done', position: 'bottom', color: '#6b7280' },
      ]}
    >
      {config?.sourceExpression ? (
        <>
          <div className="font-mono truncate">each {config.itemVariable || 'item'}</div>
          <div className="opacity-70 truncate">in {config.sourceExpression}</div>
          {config.maxIterations && (
            <div className="opacity-50">max: {config.maxIterations}</div>
          )}
        </>
      ) : (
        <div className="opacity-50 italic">Configure loop source</div>
      )}
    </BaseNodeWrapper>
  );
}
