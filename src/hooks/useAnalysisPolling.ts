import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { AnalysisStatus, StatusResponse } from '../types/api';

type SocketCallbacks = {
  onStatus?: (status: StatusResponse) => void;
  onCompleted?: () => void;
  onFailed?: (status: StatusResponse) => void;
  onError?: (message: string) => void;
};

type UseAnalysisPollingArgs = {
  baseUrl: string;
  analysisId: string;
  enabled: boolean;
  token?: string;
} & SocketCallbacks;

export function useAnalysisPolling({
  baseUrl,
  analysisId,
  enabled,
  token,
  onStatus,
  onCompleted,
  onFailed,
  onError,
}: UseAnalysisPollingArgs) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const callbacksRef = useRef<SocketCallbacks>({ onStatus, onCompleted, onFailed, onError });
  callbacksRef.current = { onStatus, onCompleted, onFailed, onError };

  useEffect(() => {
    if (!enabled || !analysisId) {
      return;
    }

    let socketServerUrl: string;
    try {
      socketServerUrl = new URL(baseUrl).origin;
    } catch {
      socketServerUrl = baseUrl;
    }

    setIsPolling(true);

    const socket = io(`${socketServerUrl}/analysis`, {
      query: { analysisId },
      auth: token ? { token } : undefined,
    });

    socket.on('progress', (data: StatusResponse) => {
      setStatus(data);
      callbacksRef.current.onStatus?.(data);
      setProgressPercent((prev) => computeProgress(data, prev));
    });

    socket.on('completed', (data: StatusResponse) => {
      setStatus(data);
      callbacksRef.current.onStatus?.(data);
      setProgressPercent(100);
      setIsPolling(false);
      callbacksRef.current.onCompleted?.();
    });

    socket.on('failed', (data: StatusResponse) => {
      setStatus(data);
      setProgressPercent(100);
      setIsPolling(false);
      callbacksRef.current.onFailed?.(data);
    });

    socket.on('connect_error', (err: Error) => {
      setIsPolling(false);
      callbacksRef.current.onError?.(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [analysisId, baseUrl, enabled]);

  return {
    status,
    progressPercent,
    isPolling,
  };
}

function computeProgress(status: StatusResponse, previous: number): number {
  const fromPayload = extractPayloadPercentage(status);
  if (typeof fromPayload === 'number') {
    return clampProgress(fromPayload);
  }

  switch (status.status as AnalysisStatus) {
    case 'pending':
      return Math.max(previous, 10);
    case 'running':
      return Math.min(Math.max(previous + 8, 20), 90);
    case 'completed':
    case 'failed':
      return 100;
    default:
      return previous;
  }
}

function extractPayloadPercentage(status: StatusResponse): number | undefined {
  if (!status.progress || typeof status.progress === 'string') {
    return undefined;
  }

  if (typeof status.progress.percentage !== 'number') {
    const currentStep = status.progress.currentStep;
    const totalSteps = status.progress.totalSteps;

    const hasStepProgress =
      typeof currentStep === 'number' &&
      typeof totalSteps === 'number' &&
      totalSteps > 0;

    if (!hasStepProgress) {
      return undefined;
    }

    return (currentStep / totalSteps) * 100;
  }

  return status.progress.percentage;
}

function clampProgress(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
