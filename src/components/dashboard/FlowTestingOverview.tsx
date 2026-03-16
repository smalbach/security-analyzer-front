import { cn } from '../../lib/cn';
import type { DashboardStats } from '../../types/dashboard';

type FlowTestingStats = DashboardStats['flowTesting'];

interface FlowTestingOverviewProps {
  data: FlowTestingStats;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-400';
    case 'completed_with_warnings':
      return 'text-yellow-400';
    case 'failed':
      return 'text-rose-400';
    case 'running':
      return 'text-sky-400';
    case 'cancelled':
      return 'text-orange-400';
    default:
      return 'text-slate-400';
  }
}

function getStatusDot(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-400';
    case 'completed_with_warnings':
      return 'bg-yellow-400';
    case 'failed':
      return 'bg-rose-400';
    case 'running':
      return 'bg-sky-400';
    default:
      return 'bg-slate-500';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function FlowTestingOverview({ data }: FlowTestingOverviewProps) {
  const { recentGroupExecutions, totalFlows, totalGroups, totalExecutions, passRate } = data;

  return (
    <div className="dash-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Flow Testing</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{totalFlows} flows</span>
          <span>{totalGroups} groups</span>
          <span>{totalExecutions} runs</span>
          {passRate > 0 && (
            <span className={cn(passRate >= 80 ? 'text-emerald-400' : passRate >= 60 ? 'text-yellow-400' : 'text-rose-400')}>
              {passRate}% pass rate
            </span>
          )}
        </div>
      </div>

      {recentGroupExecutions.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-600">No group executions yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-left text-slate-500">
                <th className="pb-2 pr-3 font-medium">Group</th>
                <th className="pb-2 pr-3 font-medium">Project</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium text-right">Passed</th>
                <th className="pb-2 pr-3 font-medium text-right">Failed</th>
                <th className="pb-2 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {recentGroupExecutions.map((exec) => (
                <tr key={exec.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-3 text-slate-200">{exec.groupName}</td>
                  <td className="py-2 pr-3 text-slate-400">{exec.projectName}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDot(exec.status))} />
                      <span className={getStatusColor(exec.status)}>
                        {exec.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-emerald-400">{exec.passedFlows}</td>
                  <td className="py-2 pr-3 text-right text-rose-400">{exec.failedFlows}</td>
                  <td className="py-2 text-right text-slate-400">{formatDuration(exec.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
