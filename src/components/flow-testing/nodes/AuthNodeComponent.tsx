import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import type { FlowCanvasNodeData, AuthNodeConfig } from '../../../types/flow';

export function AuthNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as AuthNodeConfig;

  return (
    <BaseNodeWrapper
      nodeType="auth"
      label={nodeData.label}
      status={nodeData.status}
      retryAttempt={nodeData.retryAttempt}
      maxRetries={nodeData.maxRetries}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
    >
      {config?.loginUrl ? (
        <>
          <div className="truncate font-mono">{config.method || 'POST'} {config.loginUrl}</div>
          <div className="mt-1 opacity-70">Token: {config.tokenPath || '$.token'}</div>
        </>
      ) : (
        <div className="opacity-50 italic">Configure login endpoint</div>
      )}
    </BaseNodeWrapper>
  );
}
