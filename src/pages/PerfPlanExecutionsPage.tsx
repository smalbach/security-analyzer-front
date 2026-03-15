import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import type { PerfExecution } from '../types/performance';
import { Button } from '../components/ui';

export function PerfPlanExecutionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const { api } = useAuth();
  const navigate = useNavigate();

  const [executions, setExecutions] = useState<PerfExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExecutions = useCallback(async () => {
    if (!projectId || !planId) return;
    try {
      const data = await api.getPerfExecutionsByPlan(projectId, planId);
      setExecutions(data);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, [api, projectId, planId]);

  useEffect(() => {
    void loadExecutions();
  }, [loadExecutions]);

  if (!planId) {
    return <div className="py-20 text-center text-red-400">Missing plan ID.</div>;
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading executions…</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}?tab=performance`)}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold text-slate-200">Execution History</h1>
      </div>

      {executions.length === 0 ? (
        <div className="py-10 text-center text-slate-500">
          No executions yet. Click Run on a plan to start one.
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((exec) => (
            <button
              key={exec.id}
              type="button"
              onClick={() => navigate(`/projects/${projectId}/perf-executions/${exec.id}`)}
              className="w-full flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{exec.id}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  {exec.startedAt && (
                    <span>Started: {new Date(exec.startedAt).toLocaleString()}</span>
                  )}
                  {exec.completedAt && (
                    <>
                      <span>·</span>
                      <span>Completed: {new Date(exec.completedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  exec.status === 'completed'
                    ? 'bg-green-400/10 text-green-400'
                    : exec.status === 'failed'
                      ? 'bg-red-400/10 text-red-400'
                      : exec.status === 'running'
                        ? 'bg-tide-400/10 text-tide-400'
                        : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                {exec.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
