import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type {
  PerfCompletedEvent,
  PerfFailedEvent,
  PerfMetricWindow,
  PerfMetricWindowEvent,
  PerfProgressEvent,
  PerfRunSummary,
} from '../types/performance';

type StreamCallbacks = {
  onProgress?: (event: PerfProgressEvent) => void;
  onMetricWindow?: (window: PerfMetricWindow) => void;
  onCompleted?: (summary: PerfRunSummary) => void;
  onFailed?: (error: string) => void;
  onError?: (message: string) => void;
};

type UsePerfExecutionStreamArgs = {
  baseUrl: string;
  executionId: string;
  enabled: boolean;
  token?: string;
} & StreamCallbacks;

export function usePerfExecutionStream({
  baseUrl,
  executionId,
  enabled,
  token,
  onProgress,
  onMetricWindow,
  onCompleted,
  onFailed,
  onError,
}: UsePerfExecutionStreamArgs) {
  const [progressPercent, setProgressPercent] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [metricWindows, setMetricWindows] = useState<PerfMetricWindow[]>([]);

  const callbacksRef = useRef<StreamCallbacks>({ onProgress, onMetricWindow, onCompleted, onFailed, onError });
  callbacksRef.current = { onProgress, onMetricWindow, onCompleted, onFailed, onError };

  useEffect(() => {
    if (!enabled || !executionId) return;

    let socketServerUrl: string;
    try {
      socketServerUrl = new URL(baseUrl).origin;
    } catch {
      socketServerUrl = baseUrl;
    }

    setIsStreaming(true);

    const socket = io(`${socketServerUrl}/perf-executions`, {
      query: { executionId },
      auth: token ? { token } : undefined,
    });

    socket.on('progress', (data: PerfProgressEvent) => {
      setProgressPercent(data.percentage ?? 0);
      callbacksRef.current.onProgress?.(data);
    });

    socket.on('metric-window', (data: PerfMetricWindowEvent) => {
      setMetricWindows((prev) => [...prev, data.window]);
      callbacksRef.current.onMetricWindow?.(data.window);
    });

    socket.on('completed', (data: PerfCompletedEvent) => {
      setProgressPercent(100);
      setIsStreaming(false);
      callbacksRef.current.onCompleted?.(data.summary);
    });

    socket.on('failed', (data: PerfFailedEvent) => {
      setProgressPercent(100);
      setIsStreaming(false);
      callbacksRef.current.onFailed?.(data.error);
    });

    socket.on('connect_error', (err: Error) => {
      setIsStreaming(false);
      callbacksRef.current.onError?.(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [executionId, baseUrl, enabled]);

  return {
    progressPercent,
    isStreaming,
    metricWindows,
  };
}
