import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePerfExecutionStream } from '../hooks/usePerfExecutionStream';
import type { PerfExecution, PerfMetricWindow, PerfRunSummary } from '../types/performance';
import { EndpointBreakdownTable } from '../components/performance/perf-execution/EndpointBreakdownTable';
import { PerfExecutionProgress } from '../components/performance/perf-execution/PerfExecutionProgress';
import { PerfMetricsChart } from '../components/performance/perf-execution/PerfMetricsChart';
import { PerfSummaryGrid } from '../components/performance/perf-execution/PerfSummaryGrid';
import { ScenarioStepsPanel } from '../components/performance/perf-execution/ScenarioStepsPanel';
import { ThresholdResultsTable } from '../components/performance/perf-execution/ThresholdResultsTable';
import { Button } from '../components/ui';

export function PerfExecutionPage() {
  const { projectId, execId } = useParams<{ projectId: string; execId: string }>();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [execution, setExecution] = useState<PerfExecution | null>(null);
  const [summary, setSummary] = useState<PerfRunSummary | null>(null);
  const [historicWindows, setHistoricWindows] = useState<PerfMetricWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Whether execution is actively running (stream enabled)
  const [isLive, setIsLive] = useState(false);

  const loadExecution = useCallback(async () => {
    if (!projectId || !execId) return;
    try {
      const data = await api.getPerfExecution(projectId, execId);
      setExecution(data);
      if (data.summary) setSummary(data.summary);
      setIsLive(data.status === 'pending' || data.status === 'running');

      if (data.status === 'completed' || data.status === 'failed') {
        // Load full metric windows for completed runs
        const { data: windows } = await api.getPerfMetricWindows(projectId, execId);
        setHistoricWindows(windows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution.');
    } finally {
      setLoading(false);
    }
  }, [api, projectId, execId]);

  useEffect(() => {
    void loadExecution();
  }, [loadExecution]);

  // Polling fallback: the worker fires via setImmediate almost immediately after
  // the HTTP response, so WebSocket events can be emitted before the browser socket
  // connects. If those events are missed, the page never leaves "pending" state.
  // Poll every 5 s while live so we converge to the final state even when WS is lost.
  useEffect(() => {
    if (!isLive || !projectId || !execId) return;
    const interval = setInterval(async () => {
      try {
        const statusData = await api.getPerfExecutionStatus(projectId, execId);
        // Keep execution state fresh so the progress bar updates during live runs
        setExecution((prev) => prev ? { ...prev, status: statusData.status as PerfExecution['status'], progress: statusData.progress as PerfExecution['progress'] } : prev);
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setIsLive(false);
          void loadExecution();
        }
      } catch {
        // ignore transient poll errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, projectId, execId, api, loadExecution]);

  const { progressPercent, isStreaming, metricWindows } = usePerfExecutionStream({
    baseUrl: (api as any).baseUrl ?? '',
    executionId: execId ?? '',
    enabled: isLive,
    onCompleted: (completedSummary) => {
      setSummary(completedSummary);
      setIsLive(false);
      void loadExecution();
    },
    onFailed: (errMsg) => {
      setError(errMsg);
      setIsLive(false);
      void loadExecution();
    },
  });

  const displayWindows = isLive ? metricWindows : historicWindows;
  const progress = execution?.progress;

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading execution…</div>;
  }

  if (error && !execution) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  if (!execution) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}?tab=performance`)}>
          ← Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-slate-200">
            {execution.options?.planName ?? 'Performance Execution'}
          </h1>
          <p className="text-xs text-slate-500">
            {execution.id} · {execution.status.toUpperCase()}
            {execution.startedAt && ` · Started ${new Date(execution.startedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              execution.status === 'completed'
                ? 'bg-green-400/10 text-green-400'
                : execution.status === 'failed'
                  ? 'bg-red-400/10 text-red-400'
                  : execution.status === 'running'
                    ? 'bg-tide-400/10 text-tide-400'
                    : 'bg-slate-500/10 text-slate-400'
            }`}
          >
            {execution.status}
          </span>
        </div>
      </div>

      {/* Live progress */}
      {(isLive || execution.status === 'running') && progress && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <PerfExecutionProgress
            phase={progress.phase}
            percentage={isStreaming ? progressPercent : progress.percentage}
            message={progress.message}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Live metrics chart */}
      {displayWindows.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">
            Response Time &amp; Throughput
            {isStreaming && <span className="ml-2 animate-pulse text-xs font-normal text-tide-400">● live</span>}
          </h2>
          <PerfMetricsChart windows={displayWindows} />
        </div>
      )}

      {/* Summary grid */}
      {summary && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Run Summary</h2>
          <PerfSummaryGrid summary={summary} />
        </div>
      )}

      {/* Threshold results */}
      {summary && summary.thresholdResults.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Threshold Results</h2>
          <ThresholdResultsTable results={summary.thresholdResults} />
        </div>
      )}

      {/* Endpoint breakdown */}
      {historicWindows.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Endpoint Breakdown</h2>
          <EndpointBreakdownTable windows={historicWindows} />
        </div>
      )}

      {/* Scenarios executed */}
      {execution.options && execution.options.scenarios.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Scenarios Executed</h2>
          <ScenarioStepsPanel options={execution.options} />
        </div>
      )}

      {/* Load profile snapshot */}
      {execution.options && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Configuration Snapshot</h2>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>Strategy: <span className="text-slate-200">{execution.options.loadProfile.strategy}</span></span>
            <span>VUs: <span className="text-slate-200">{execution.options.loadProfile.virtualUsers}</span></span>
            <span>Duration: <span className="text-slate-200">{execution.options.loadProfile.durationSeconds}s</span></span>
            <span>Scenarios: <span className="text-slate-200">{execution.options.scenarios.length}</span></span>
            <span>Thresholds: <span className="text-slate-200">{execution.options.thresholds.length}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
