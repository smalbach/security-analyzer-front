import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, ScriptNodeConfig } from '../../../types/flow';

export function ScriptNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as ScriptNodeConfig;
  const codePreview = config?.code ? config.code.slice(0, 60) : '';

  return (
    <BaseNodeWrapper
      nodeType="script"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
    >
      {codePreview ? (
        <div className="font-mono truncate opacity-70">{codePreview}...</div>
      ) : (
        <div className="opacity-50 italic">Write script code</div>
      )}
    </BaseNodeWrapper>
  );
}
