import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { TestRun, EndpointTestResult, SecurityCheck, Severity } from '../types/api';

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-200 border-red-400/40',
  high: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
  medium: 'bg-amber-500/20 text-amber-100 border-amber-400/40',
  low: 'bg-teal-500/20 text-teal-100 border-teal-400/40',
  info: 'bg-slate-500/20 text-slate-300 border-slate-400/40',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  running: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  failed: 'bg-red-500/20 text-red-200 border-red-400/40',
};

const RISK_COLOR: Record<string, string> = {
  Critical: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-amber-400',
  Low: 'text-teal-400',
};

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : score >= 40 ? '#fb923c' : '#f87171';
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function CheckItem({ check }: { check: SecurityCheck }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border ${check.passed ? 'border-emerald-500/20' : 'border-red-500/20'} bg-white/3 p-3`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="mt-0.5 shrink-0 text-base">{check.passed ? '✅' : '❌'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{check.ruleName}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SEVERITY_BADGE[check.severity]}`}>
              {check.severity}
            </span>
          </div>
          {!check.passed && (
            <p className="mt-0.5 text-xs text-slate-400">{check.finding}</p>
          )}
        </div>
        <span className="shrink-0 text-slate-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && !check.passed && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-300">{check.description}</p>
          </div>
          {check.remediation && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remediation</p>
              <p className="mt-1 text-sm text-slate-300">{check.remediation}</p>
            </div>
          )}
          {check.evidence && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
              <pre className="mt-1 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-xs text-slate-300">
                {check.evidence}
              </pre>
            </div>
          )}
          {check.reproduceSteps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Steps to Reproduce</p>
              <ol className="mt-1 list-decimal pl-4 text-sm text-slate-300">
                {check.reproduceSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EndpointResultCard({ result }: { result: EndpointTestResult }) {
  const [open, setOpen] = useState(false);
  const failures = result.checks.filter((c) => !c.passed);
  const hasIssues = failures.length > 0;

  return (
    <div className={`rounded-2xl border ${hasIssues ? 'border-red-500/20' : 'border-emerald-500/20'} bg-white/5 overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`font-mono text-xs font-bold ${hasIssues ? 'text-red-400' : 'text-emerald-400'}`}>
          {result.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-200">{result.url}</span>
        <div className="flex shrink-0 items-center gap-3">
          {result.criticalFindings > 0 && (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
              {result.criticalFindings} critical
            </span>
          )}
          {result.highFindings > 0 && (
            <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
              {result.highFindings} high
            </span>
          )}
          <span className="text-xs text-slate-500">
            {result.passedChecks}/{result.passedChecks + result.failedChecks} passed
          </span>
          <span className="text-slate-500">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-2">
          {result.checks.length === 0 ? (
            <p className="text-sm text-slate-500">No checks performed.</p>
          ) : (
            result.checks
              .sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1))
              .map((c, i) => <CheckItem key={i} check={c} />)
          )}
        </div>
      )}
    </div>
  );
}

export function TestRunPage() {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRun = useCallback(async () => {
    if (!projectId || !runId) return;
    try {
      const r = await api.getTestRun(projectId, runId);
      setRun(r);
      if (r.status === 'completed' || r.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test run');
      if (pollRef.current) clearInterval(pollRef.current);
    } finally {
      setLoading(false);
    }
  }, [api, projectId, runId]);

  useEffect(() => {
    void fetchRun();
    pollRef.current = setInterval(() => void fetchRun(), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchRun]);

  const handleDownload = async (format: 'json' | 'html' | 'pdf') => {
    if (!projectId || !runId) return;
    try {
      const blob = await api.downloadTestRunReport(projectId, runId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${runId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading test run...</div>;
  if (error) return <div className="py-20 text-center text-red-400">{error}</div>;
  if (!run) return null;

  const summary = run.summary;
  const aiAnalysis = run.aiAnalysis;
  const endpointResults = (run.endpointResults ?? []) as EndpointTestResult[];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-sm text-slate-500 hover:text-slate-300"
      >
        ← Back to project
      </button>

      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{run.label ?? 'Test Run'}</h1>
              <span className={`rounded-full border px-3 py-0.5 text-sm ${STATUS_BADGE[run.status]}`}>
                {run.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Started {run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
              {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
            </p>
          </div>

          {run.status === 'completed' && (
            <div className="flex gap-2">
              {(['json', 'html', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => void handleDownload(fmt)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 uppercase hover:bg-white/10"
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar while running */}
        {run.status === 'running' && run.progress && typeof run.progress === 'object' && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{run.progress.phase ?? 'Running...'}</span>
              {typeof run.progress.percentage === 'number' && (
                <span>{run.progress.percentage}%</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-tide-500 transition-all"
                style={{ width: `${run.progress.percentage ?? 0}%` }}
              />
            </div>
            {run.progress.detail && (
              <p className="mt-1 text-xs text-slate-500">{run.progress.detail}</p>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {summary.securityScore !== undefined && (
            <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-1">
              <ScoreCircle score={summary.securityScore} />
              <div>
                <p className="text-xs text-slate-500">Score</p>
                {aiAnalysis && (
                  <p className={`text-sm font-semibold ${RISK_COLOR[aiAnalysis.globalRiskLevel]}`}>
                    {aiAnalysis.globalRiskLevel}
                  </p>
                )}
              </div>
            </div>
          )}
          {[
            { label: 'Endpoints', value: summary.totalEndpoints },
            { label: 'Checks', value: summary.totalChecks },
            { label: 'Passed', value: summary.totalPassed, color: 'text-emerald-400' },
            { label: 'Failed', value: summary.totalFailed, color: 'text-red-400' },
            { label: 'Critical', value: summary.criticalCount, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color ?? 'text-slate-200'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl">
          <h2 className="mb-3 font-semibold text-slate-200">AI Analysis</h2>
          <p className="text-sm text-slate-300">{aiAnalysis.executiveSummary}</p>

          {aiAnalysis.top5Vulnerabilities?.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-400">Top Vulnerabilities</h3>
              <div className="space-y-2">
                {aiAnalysis.top5Vulnerabilities.map((v) => (
                  <div key={v.rank} className="flex gap-3 rounded-xl border border-white/10 bg-white/3 p-3">
                    <span className="shrink-0 text-sm font-bold text-tide-400">#{v.rank}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{v.title}</p>
                      <p className="text-xs text-slate-400">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Endpoint Results */}
      {endpointResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-200">Endpoint Results</h2>
          {endpointResults.map((r, i) => (
            <EndpointResultCard key={i} result={r} />
          ))}
        </div>
      )}

      {run.status === 'failed' && run.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{run.error}</p>
        </div>
      )}
    </div>
  );
}
