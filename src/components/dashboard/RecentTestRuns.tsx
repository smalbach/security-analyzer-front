import { cn } from '../../lib/cn';
import type { DashboardStats } from '../../types/dashboard';

interface RecentTestRunsProps {
  runs: DashboardStats['recentTestRuns'];
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'text-emerald-400',
  running: 'text-amber-400',
  pending: 'text-sky-400',
  failed: 'text-rose-400',
};

const RISK_BADGE: Record<string, string> = {
  critical: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

export function RecentTestRuns({ runs }: RecentTestRunsProps) {
  return (
    <div className="dash-card">
      <h3 className="text-sm font-semibold">
        Recent Test Runs <span className="text-slate-500">({runs.length})</span>
      </h3>

      {runs.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No test runs yet. Start your first security test!</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="dash-table w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="pb-3 pr-4">Project</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3 pr-4">Risk</th>
                <th className="pb-3 pr-4">Passed / Failed</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="dash-table-row">
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium">{run.projectName}</p>
                    {run.label && <p className="text-xs text-slate-500">{run.label}</p>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm font-bold">
                      {run.securityScore != null ? `${run.securityScore}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {run.riskLevel ? (
                      <span className={cn('inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize', RISK_BADGE[run.riskLevel] ?? RISK_BADGE.medium)}>
                        {run.riskLevel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm">
                    <span className="text-emerald-400">{run.totalPassed}</span>
                    <span className="text-slate-600"> / </span>
                    <span className="text-rose-400">{run.totalFailed}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn('text-xs font-semibold capitalize', STATUS_STYLES[run.status] ?? 'text-slate-400')}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-slate-400">
                    {run.completedAt
                      ? new Date(run.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : new Date(run.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
