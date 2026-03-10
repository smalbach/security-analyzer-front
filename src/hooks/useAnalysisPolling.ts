import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../lib/api';
import type { AnalysisStatus, StatusResponse } from '../types/api';

type PollingCallbacks = {
  onStatus?: (status: StatusResponse) => void;
  onCompleted?: () => void;
  onFailed?: () => void;
  onError?: (message: string) => void;
};

type UseAnalysisPollingArgs = {
  client: ApiClient;
  analysisId: string;
  enabled: boolean;
} & PollingCallbacks;

export function useAnalysisPolling({
  client,
  analysisId,
  enabled,
  onStatus,
  onCompleted,
  onFailed,
  onError,
}: UseAnalysisPollingArgs) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const callbacksRef = useRef<PollingCallbacks>({ onStatus, onCompleted, onFailed, onError });
  callbacksRef.current = { onStatus, onCompleted, onFailed, onError };

  useEffect(() => {
    if (!enabled || !analysisId) {
      return;
    }

    let cancelled = false;
    setIsPolling(true);

    const tick = async (): Promise<void> => {
      try {
        const nextStatus = await client.getStatus(analysisId);

        if (cancelled) {
          return;
        }

        setStatus(nextStatus);
        callbacksRef.current.onStatus?.(nextStatus);

        setProgressPercent((prev) => computeProgress(nextStatus, prev));

        if (nextStatus.status === 'completed') {
          setProgressPercent(100);
          setIsPolling(false);
          callbacksRef.current.onCompleted?.();
        }

        if (nextStatus.status === 'failed') {
          setProgressPercent(100);
          setIsPolling(false);
          callbacksRef.current.onFailed?.();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setIsPolling(false);
        const message = error instanceof Error ? error.message : 'Error consultando estado';
        callbacksRef.current.onError?.(message);
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [analysisId, client, enabled]);

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
    return undefined;
  }

  return status.progress.percentage;
}

function clampProgress(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}
