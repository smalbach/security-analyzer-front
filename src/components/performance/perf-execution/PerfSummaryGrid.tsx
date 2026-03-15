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
  const noThresholds = summary.thresholdResults.length === 0;
  // PASSED is vacuously true when no thresholds are configured — show it as neutral
  const passedColor = noThresholds
    ? 'text-slate-400'
    : summary.passed
      ? 'text-green-400'
      : 'text-red-400';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div className="metric-card">
        <p className="metric-label">Status</p>
        <p className={`metric-value ${passedColor}`}>{summary.passed ? 'PASSED' : 'FAILED'}</p>
        {noThresholds && <p className="mt-0.5 text-xs text-slate-500">no thresholds set</p>}
      </div>
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
