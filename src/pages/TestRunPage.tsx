import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EndpointResultCard,
  ExecutiveReportSection,
  INITIAL_TEST_RUN_FILTERS,
  TestRunAiAnalysis,
  TestRunFilters,
  TestRunSummaryGrid,
  applyTestRunFilters,
  getTestRunFilterOptions,
  hasActiveTestRunFilters,
  sanitizeTestRunFilters,
  summarizeFilteredTestRunResults,
  type TestRunFilterState,
} from '../components/test-run';
import { Button, EmptyState, LinkButton, PageSizeSelector } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import { TEST_RUN_STATUS_BADGE } from '../lib/testRuns';
import type { EndpointTestResult, PaginatedTestRunResults, ReportFormat, TestRun } from '../types/api';

const DEFAULT_PAGE_SIZE = 50;

export function TestRunPage() {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  const { api } = useAuth();

  // Core run metadata (status, summary, aiAnalysis) — refreshed while running
  const [run, setRun] = useState<TestRun | null>(null);
  // Paginated endpoint results — only fetched after completion
  const [paginatedResults, setPaginatedResults] = useState<PaginatedTestRunResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TestRunFilterState>(INITIAL_TEST_RUN_FILTERS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  /** Fetch paginated results for a completed run */
  const fetchResults = useCallback(async (page: number, limit = pageSize) => {
    if (!projectId || !runId) return;
    setResultsLoading(true);
    try {
      const data = await api.getTestRunResults(projectId, runId, { page, limit });
      setPaginatedResults(data);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      // Non-critical — keep showing what we have
    } finally {
      setResultsLoading(false);
    }
  }, [api, projectId, runId, pageSize]);

  /** Poll lightweight status while running; load full data on first load or completion */
  const fetchRun = useCallback(async () => {
    if (!projectId || !runId) return;

    try {
      const nextRun = await api.getTestRun(projectId, runId);
      setRun(nextRun);

      if (nextRun.status === 'completed' || nextRun.status === 'failed') {
        stopPolling();
        // On first completion fetch results page 1
        if (!paginatedResults) {
          await fetchResults(1);
        }
      }
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) return;
      setError(loadError instanceof Error ? loadError.message : 'Failed to load test run');
      stopPolling();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, projectId, runId, fetchResults]);

  useEffect(() => {
    void fetchRun();
    pollRef.current = setInterval(() => void fetchRun(), 3000);
    return () => { stopPolling(); };
  }, [fetchRun]);

  const handlePageChange = async (page: number) => {
    await fetchResults(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    void fetchResults(1, size);
  };

  const handleDownload = async (format: ReportFormat) => {
    if (!projectId || !runId) return;
    try {
      const blob = await api.downloadTestRunReport(projectId, runId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `report-${runId}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (isUnauthorizedError(downloadError)) return;
      alert(downloadError instanceof Error ? downloadError.message : 'Download failed');
    }
  };

  const summary = run?.summary;
  const aiAnalysis = run?.aiAnalysis;

  // For filtering we work on the current page's results
  const endpointResults = useMemo(
    () => (paginatedResults?.endpointResults ?? []) as EndpointTestResult[],
    [paginatedResults],
  );
  const filteredEndpointResults = useMemo(
    () => applyTestRunFilters(endpointResults, filters),
    [endpointResults, filters],
  );
  const filterOptions = useMemo(
    () => getTestRunFilterOptions(endpointResults, filters),
    [endpointResults, filters],
  );
  const filterSummary = useMemo(
    () => summarizeFilteredTestRunResults(filteredEndpointResults, endpointResults),
    [filteredEndpointResults, endpointResults],
  );
  const hasActiveFilters = useMemo(() => hasActiveTestRunFilters(filters), [filters]);

  useEffect(() => {
    setFilters((currentFilters) => {
      const sanitizedFilters = sanitizeTestRunFilters(currentFilters, filterOptions);
      return areSameFilters(currentFilters, sanitizedFilters) ? currentFilters : sanitizedFilters;
    });
  }, [filterOptions]);

  const pagination = paginatedResults?.pagination;
  const totalEndpoints = paginatedResults?.endpointResultsTotal ?? 0;

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading test run...</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  if (!run) {
    return null;
  }

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
      {aiAnalysis?.findingGroups?.length ? (
        <ExecutiveReportSection findingGroups={aiAnalysis.findingGroups} />
      ) : null}

      {run.status === 'completed' ? (
        <div className="space-y-3">
          <TestRunFilters
            filters={filters}
            options={filterOptions}
            summary={filterSummary}
            hasActiveFilters={hasActiveFilters}
            onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
            onReset={() => setFilters(INITIAL_TEST_RUN_FILTERS)}
          />

          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-200">Endpoint Results</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} disabled={resultsLoading} />
              {pagination && pagination.totalPages > 1 ? (
                <span>
                  Page {pagination.page} / {pagination.totalPages} ({totalEndpoints} endpoints)
                </span>
              ) : (
                <span>{totalEndpoints} endpoint{totalEndpoints !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {resultsLoading ? (
            <div className="py-10 text-center text-slate-500">Loading results...</div>
          ) : filteredEndpointResults.length ? (
            filteredEndpointResults.map((result, index) => (
              <EndpointResultCard key={`${result.url}-${index}`} result={result} />
            ))
          ) : (
            <EmptyState
              title="No endpoint results match the current filters"
              description="Adjust one or more selectors to broaden the visible results."
              action={hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={() => setFilters(INITIAL_TEST_RUN_FILTERS)}>
                  Reset filters
                </Button>
              ) : undefined}
              className="bg-white/5"
            />
          )}

          {/* Pagination controls */}
          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1 || resultsLoading}
                onClick={() => void handlePageChange(pagination.page - 1)}
              >
                ← Prev
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - pagination.page) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => void handlePageChange(p)}
                      disabled={resultsLoading}
                      className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                        p === pagination.page
                          ? 'bg-tide-500 text-white'
                          : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || resultsLoading}
                onClick={() => void handlePageChange(pagination.page + 1)}
              >
                Next →
              </Button>
            </div>
          ) : null}
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

function areSameFilters(left: TestRunFilterState, right: TestRunFilterState): boolean {
  return left.method === right.method
    && left.endpointId === right.endpointId
    && left.resultState === right.resultState
    && left.severity === right.severity
    && left.category === right.category
    && left.ruleId === right.ruleId
    && left.checkStatus === right.checkStatus
    && left.httpStatusFamily === right.httpStatusFamily
    && left.httpStatus === right.httpStatus
    && left.testType === right.testType
    && left.sortBy === right.sortBy;
}
