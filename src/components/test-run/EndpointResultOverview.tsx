import type { EndpointTestResult } from '../../types/api';
import { MetricCard } from '../ui';

interface EndpointResultOverviewProps {
  result: EndpointTestResult;
  totalCheckCount: number;
  totalHttpResultCount: number;
}

export function EndpointResultOverview({
  result,
  totalCheckCount,
  totalHttpResultCount,
}: EndpointResultOverviewProps) {
  const passRate = result.passedChecks + result.failedChecks > 0
    ? Math.round((result.passedChecks / (result.passedChecks + result.failedChecks)) * 100)
    : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="HTTP runs" value={`${result.httpResults.length}/${totalHttpResultCount}`} />
      <MetricCard label="Checks" value={`${result.checks.length}/${totalCheckCount}`} />
      <MetricCard label="Pass rate" value={`${passRate}%`} valueClassName={passRate === 100 ? 'text-emerald-300' : 'text-slate-200'} />
      <MetricCard label="Failed" value={result.failedChecks} valueClassName="text-red-300" />
      <MetricCard label="Critical" value={result.criticalFindings} valueClassName="text-red-300" />
      <MetricCard label="High" value={result.highFindings} valueClassName="text-orange-300" />
    </div>
  );
}
