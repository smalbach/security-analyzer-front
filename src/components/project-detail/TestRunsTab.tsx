import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { TEST_RUN_STATUS_BADGE, getTestRunDateLabel } from '../../lib/testRuns';
import type { Project, TestRun } from '../../types/api';
import { Button, EmptyState } from '../ui';
import { StartTestRunModal } from './StartTestRunModal';

interface TestRunsTabProps {
  project: Project;
}

export function TestRunsTab({ project }: TestRunsTabProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const response = await api.getTestRuns(project.id, { limit: 20 });
      setRuns(response.data);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }
      // Keep the current list if fetching fails.
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  return (
    <div className="space-y-4">
      <div>
        <Button onClick={() => setShowStartModal(true)}>Start Test Run</Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading...</div>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No test runs yet."
          description="Launch a test run to execute the configured rules against this project."
        />
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => navigate(`/projects/${project.id}/test-runs/${run.id}`)}
              className="flex w-full flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-tide-400/30"
            >
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${TEST_RUN_STATUS_BADGE[run.status]}`}
              >
                {run.status}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {run.label ?? `Run ${run.id.slice(0, 8)}`}
              </span>
              {run.summary?.securityScore !== undefined ? (
                <span className="shrink-0 text-sm font-bold text-tide-300">
                  Score: {run.summary.securityScore}
                </span>
              ) : null}
              <span className="shrink-0 text-xs text-slate-500">{getTestRunDateLabel(run)}</span>
            </button>
          ))}
        </div>
      )}

      {showStartModal ? (
        <StartTestRunModal
          project={project}
          onClose={() => setShowStartModal(false)}
          onStarted={(run) => {
            setRuns((previous) => [run, ...previous]);
            setShowStartModal(false);
            navigate(`/projects/${project.id}/test-runs/${run.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
