import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EndpointResultCard, TestRunAiAnalysis, TestRunSummaryGrid } from '../components/test-run';
import { Button, LinkButton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import { TEST_RUN_STATUS_BADGE } from '../lib/testRuns';
import type { EndpointTestResult, ReportFormat, TestRun } from '../types/api';

export function TestRunPage() {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  const { api } = useAuth();

  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchRun = useCallback(async () => {
    if (!projectId || !runId) {
      return;
    }

    try {
      const nextRun = await api.getTestRun(projectId, runId);
      setRun(nextRun);

      if (nextRun.status === 'completed' || nextRun.status === 'failed') {
        stopPolling();
      }
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'Failed to load test run');
      stopPolling();
    } finally {
      setLoading(false);
    }
  }, [api, projectId, runId]);

  useEffect(() => {
    void fetchRun();
    pollRef.current = setInterval(() => void fetchRun(), 3000);

    return () => {
      stopPolling();
    };
  }, [fetchRun]);

  const handleDownload = async (format: ReportFormat) => {
    if (!projectId || !runId) {
      return;
    }

    try {
      const blob = await api.downloadTestRunReport(projectId, runId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `report-${runId}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (isUnauthorizedError(downloadError)) {
        return;
      }
      alert(downloadError instanceof Error ? downloadError.message : 'Download failed');
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading test run...</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  if (!run) {
    return null;
  }

  const summary = run.summary;
  const aiAnalysis = run.aiAnalysis;
  const endpointResults = (run.endpointResults ?? []) as EndpointTestResult[];

  return (
    <div className="space-y-6">
      <LinkButton
        to={projectId ? `/projects/${projectId}` : '/projects'}
        variant="link"
        size="sm"
        className="text-slate-500 hover:text-slate-300"
      >
        {'<'} Back to project
      </LinkButton>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{run.label ?? 'Test Run'}</h1>
              <span className={`rounded-full border px-3 py-0.5 text-sm ${TEST_RUN_STATUS_BADGE[run.status]}`}>
                {run.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Started {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
              {run.completedAt ? ` | Completed ${new Date(run.completedAt).toLocaleString()}` : ''}
            </p>
          </div>

          {run.status === 'completed' ? (
            <div className="flex gap-2">
              {(['json', 'html', 'pdf'] as const).map((format) => (
                <Button
                  key={format}
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleDownload(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {run.status === 'running' && run.progress && typeof run.progress === 'object' ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{run.progress.phase ?? 'Running...'}</span>
              {typeof run.progress.percentage === 'number' ? (
                <span>{run.progress.percentage}%</span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-tide-500 transition-all"
                style={{ width: `${run.progress.percentage ?? 0}%` }}
              />
            </div>
            {run.progress.detail ? (
              <p className="mt-1 text-xs text-slate-500">{run.progress.detail}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {summary ? <TestRunSummaryGrid summary={summary} aiAnalysis={aiAnalysis} /> : null}
      {aiAnalysis ? <TestRunAiAnalysis analysis={aiAnalysis} /> : null}

      {endpointResults.length ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-200">Endpoint Results</h2>
          {endpointResults.map((result, index) => (
            <EndpointResultCard key={`${result.url}-${index}`} result={result} />
          ))}
        </div>
      ) : null}

      {run.status === 'failed' && run.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{run.error}</p>
        </div>
      ) : null}
    </div>
  );
}
