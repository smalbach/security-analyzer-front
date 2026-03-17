import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type {
  FlowNodeStartedEvent,
  FlowNodeCompletedEvent,
  FlowNodeFailedEvent,
  FlowNodeRetryingEvent,
  FlowNodeSkippedEvent,
  FlowLoopIterationEvent,
  FlowExecutionCompletedEvent,
  FlowExecutionFailedEvent,
  FlowExecutionSummary,
} from '../types/flow';

type StreamCallbacks = {
  onNodeStarted?: (event: FlowNodeStartedEvent) => void;
  onNodeCompleted?: (event: FlowNodeCompletedEvent) => void;
  onNodeFailed?: (event: FlowNodeFailedEvent) => void;
  onNodeRetrying?: (event: FlowNodeRetryingEvent) => void;
  onNodeSkipped?: (event: FlowNodeSkippedEvent) => void;
  onLoopIteration?: (event: FlowLoopIterationEvent) => void;
  onExecutionCompleted?: (event: FlowExecutionCompletedEvent) => void;
  onExecutionFailed?: (event: FlowExecutionFailedEvent) => void;
  onExecutionCancelled?: (executionId: string) => void;
  onError?: (message: string) => void;
};

type UseFlowExecutionStreamArgs = {
  baseUrl: string;
  executionId: string;
  enabled: boolean;
  token?: string;
} & StreamCallbacks;

export function useFlowExecutionStream({
  baseUrl,
  executionId,
  enabled,
  token,
  onNodeStarted,
  onNodeCompleted,
  onNodeFailed,
  onNodeRetrying,
  onNodeSkipped,
  onLoopIteration,
  onExecutionCompleted,
  onExecutionFailed,
  onExecutionCancelled,
  onError,
}: UseFlowExecutionStreamArgs) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [summary, setSummary] = useState<FlowExecutionSummary | null>(null);

  const callbacksRef = useRef<StreamCallbacks>({
    onNodeStarted, onNodeCompleted, onNodeFailed, onNodeRetrying,
    onNodeSkipped, onLoopIteration, onExecutionCompleted, onExecutionFailed, onExecutionCancelled, onError,
  });
  callbacksRef.current = {
    onNodeStarted, onNodeCompleted, onNodeFailed, onNodeRetrying,
    onNodeSkipped, onLoopIteration, onExecutionCompleted, onExecutionFailed, onExecutionCancelled, onError,
  };

  useEffect(() => {
    if (!enabled || !executionId) return;

    let socketServerUrl: string;
    try {
      socketServerUrl = new URL(baseUrl).origin;
    } catch {
      socketServerUrl = baseUrl;
    }

    setIsStreaming(true);

    const socket = io(`${socketServerUrl}/flow-executions`, {
      query: { executionId },
      auth: token ? { token } : undefined,
    });

    socket.on('node-started', (data: FlowNodeStartedEvent) => {
      callbacksRef.current.onNodeStarted?.(data);
    });

    socket.on('node-completed', (data: FlowNodeCompletedEvent) => {
      callbacksRef.current.onNodeCompleted?.(data);
    });

    socket.on('node-failed', (data: FlowNodeFailedEvent) => {
      callbacksRef.current.onNodeFailed?.(data);
    });

    socket.on('node-retrying', (data: FlowNodeRetryingEvent) => {
      callbacksRef.current.onNodeRetrying?.(data);
    });

    socket.on('node-skipped', (data: FlowNodeSkippedEvent) => {
      callbacksRef.current.onNodeSkipped?.(data);
    });

    socket.on('loop-iteration', (data: FlowLoopIterationEvent) => {
      callbacksRef.current.onLoopIteration?.(data);
    });

    socket.on('execution-completed', (data: FlowExecutionCompletedEvent) => {
      setSummary(data.summary);
      setIsStreaming(false);
      callbacksRef.current.onExecutionCompleted?.(data);
    });

    socket.on('execution-failed', (data: FlowExecutionFailedEvent) => {
      setIsStreaming(false);
      callbacksRef.current.onExecutionFailed?.(data);
    });

    socket.on('execution-cancelled', (data: { executionId: string }) => {
      setIsStreaming(false);
      callbacksRef.current.onExecutionCancelled?.(data.executionId);
    });

    socket.on('connect_error', (err: Error) => {
      setIsStreaming(false);
      callbacksRef.current.onError?.(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [executionId, baseUrl, enabled]);

  return { isStreaming, summary };
}
