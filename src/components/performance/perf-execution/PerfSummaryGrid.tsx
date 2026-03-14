import type { PerfRunSummary } from '../../../types/performance';
import { MetricCard } from '../../ui';

interface PerfSummaryGridProps {
  summary: PerfRunSummary;
}

function fmtMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function fmtRps(rps: number): string {
  return `${rps.toFixed(1)} req/s`;
}

export function PerfSummaryGrid({ summary }: PerfSummaryGridProps) {
  const passedColor = summary.passed ? 'text-green-400' : 'text-red-400';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard label="Status" value={summary.passed ? 'PASSED' : 'FAILED'} valueClassName={passedColor} />
      <MetricCard label="Total Requests" value={summary.totalRequests.toLocaleString()} />
      <MetricCard label="Error Rate" value={fmtPct(summary.errorRate)} valueClassName={summary.errorRate > 0.01 ? 'text-red-400' : undefined} />
      <MetricCard label="Avg RPS" value={fmtRps(summary.avgRps)} />
      <MetricCard label="Peak RPS" value={fmtRps(summary.peakRps)} />
      <MetricCard label="P50" value={fmtMs(summary.p50)} />
      <MetricCard label="P95" value={fmtMs(summary.p95)} />
      <MetricCard label="P99" value={fmtMs(summary.p99)} />
      <MetricCard label="Avg Response" value={fmtMs(summary.avgResponseTime)} />
      <MetricCard label="Duration" value={`${summary.durationSeconds}s`} />
    </div>
  );
}
