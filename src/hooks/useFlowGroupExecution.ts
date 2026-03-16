import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  GroupFlowStartedEvent,
  GroupFlowCompletedEvent,
  GroupExecutionCompletedEvent,
  GroupExecutionFailedEvent,
  FlowGroupExecutionSummary,
  FlowExecutionSummary,
} from '../types/flow';

interface FlowResult {
  flowId: string;
  flowName: string;
  flowIndex: number;
  status: string;
  summary: FlowExecutionSummary | null;
  executionId: string;
  error?: string | null;
}

interface UseFlowGroupExecutionArgs {
  baseUrl: string;
  groupExecutionId: string | null;
  enabled: boolean;
  token?: string;
  onCompleted?: (summary: FlowGroupExecutionSummary) => void;
  onFailed?: (error: string) => void;
}

export function useFlowGroupExecution({
  baseUrl,
  groupExecutionId,
  enabled,
  token,
  onCompleted,
  onFailed,
}: UseFlowGroupExecutionArgs) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentFlowIndex, setCurrentFlowIndex] = useState(-1);
  const [currentFlowName, setCurrentFlowName] = useState('');
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [completedFlows, setCompletedFlows] = useState(0);
  const [totalFlows, setTotalFlows] = useState(0);
  const [flowResults, setFlowResults] = useState<FlowResult[]>([]);
  const [summary, setSummary] = useState<FlowGroupExecutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callbacksRef = useRef({ onCompleted, onFailed });
  callbacksRef.current = { onCompleted, onFailed };

  const reset = useCallback(() => {
    setIsRunning(false);
    setCurrentFlowIndex(-1);
    setCurrentFlowName('');
    setCurrentExecutionId(null);
    setCompletedFlows(0);
    setTotalFlows(0);
    setFlowResults([]);
    setSummary(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!enabled || !groupExecutionId) return;

    let socketServerUrl: string;
    try {
      socketServerUrl = new URL(baseUrl).origin;
    } catch {
      socketServerUrl = baseUrl;
    }

    setIsRunning(true);
    setError(null);
    setSummary(null);
    setFlowResults([]);

    const socket: Socket = io(`${socketServerUrl}/flow-executions`, {
      query: { groupExecutionId },
      auth: token ? { token } : undefined,
    });

    socket.on('group-flow-started', (data: GroupFlowStartedEvent) => {
      setCurrentFlowIndex(data.flowIndex);
      setCurrentFlowName(data.flowName);
      setTotalFlows(data.totalFlows);
      setCurrentExecutionId(data.executionId || null);
    });

    socket.on('group-flow-completed', (data: GroupFlowCompletedEvent) => {
      setCompletedFlows((prev) => prev + 1);
      setFlowResults((prev) => [
        ...prev,
        {
          flowId: data.flowId,
          flowName: data.flowName,
          flowIndex: data.flowIndex,
          status: data.status,
          summary: data.summary,
          executionId: data.executionId,
          error: data.error || null,
        },
      ]);
    });

    socket.on('group-execution-completed', (data: GroupExecutionCompletedEvent) => {
      setSummary(data.summary);
      setIsRunning(false);
      setCurrentFlowIndex(-1);
      setCurrentFlowName('');
      setCurrentExecutionId(null);
      callbacksRef.current.onCompleted?.(data.summary);
    });

    socket.on('group-execution-failed', (data: GroupExecutionFailedEvent) => {
      setError(data.error);
      setIsRunning(false);
      callbacksRef.current.onFailed?.(data.error);
    });

    socket.on('connect_error', (err: Error) => {
      setError(err.message);
      setIsRunning(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [groupExecutionId, baseUrl, enabled]);

  return {
    isRunning,
    currentFlowIndex,
    currentFlowName,
    currentExecutionId,
    completedFlows,
    totalFlows,
    flowResults,
    summary,
    error,
    reset,
  };
}
