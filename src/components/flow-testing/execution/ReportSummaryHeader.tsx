import { cn } from '../../../lib/cn';
import { CATEGORY_LABELS, type ErrorCategory, type ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import type { FlowExecutionSummary } from '../../../types/flow';

const CATEGORY_PILL_COLORS: Record<string, string> = {
  network: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  auth: 'border-red-500/20 bg-red-500/10 text-red-400',
  http_status: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  config: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  script: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  schema: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  assertion: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  unknown: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
};

interface ReportSummaryHeaderProps {
  summary: FlowExecutionSummary | null;
  diagnoses: ErrorDiagnosis[];
  overallStatus: 'success' | 'warning' | 'error';
  onClose: () => void;
  onShowTimeline: () => void;
}

export function ReportSummaryHeader({ summary, diagnoses, overallStatus, onClose, onShowTimeline }: ReportSummaryHeaderProps) {
  const { nodeStatuses } = useFlowBuilderStore();

  // Group diagnoses by category
  const byCat: Partial<Record<ErrorCategory, number>> = {};
  for (const d of diagnoses) {
    byCat[d.category] = (byCat[d.category] || 0) + 1;
  }

  // Fallback counters from WS node statuses when summary is missing
  const fallbackCounts = !summary ? (() => {
    const statuses = Object.values(nodeStatuses);
    return {
      passed: statuses.filter((s) => s === 'success').length,
      warnings: statuses.filter((s) => s === 'warning').length,
      errors: statuses.filter((s) => s === 'error').length,
      skipped: statuses.filter((s) => s === 'skipped').length,
      total: statuses.length,
    };
  })() : null;

  return (
    <div className="sticky top-0 z-10 border-b border-white/5 bg-[rgba(var(--bg-900),0.98)] px-4 py-2.5">
      <div className="flex items-center gap-3">
        {/* Overall status badge */}
        <div className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
          overallStatus === 'success' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
          overallStatus === 'warning' && 'border-amber-500/20 bg-amber-500/10 text-amber-400',
          overallStatus === 'error' && 'border-red-500/20 bg-red-500/10 text-red-400',
        )}>
          <span>{overallStatus === 'success' ? '✓' : overallStatus === 'warning' ? '⚠' : '✗'}</span>
          <span>{overallStatus === 'success' ? 'All Passed' : overallStatus === 'warning' ? 'Warnings' : 'Failed'}</span>
        </div>

        {/* Counters */}
        {summary ? (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400">{summary.passed} passed</span>
            {summary.warnings > 0 && <span className="text-amber-400">{summary.warnings} warnings</span>}
            {summary.errors > 0 && <span className="text-red-400">{summary.errors} failed</span>}
            {summary.skipped > 0 && <span className="text-slate-500">{summary.skipped} skipped</span>}
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">{summary.durationMs}ms total</span>
          </div>
        ) : fallbackCounts && (
          <div className="flex items-center gap-2 text-[11px]">
            {fallbackCounts.passed > 0 && <span className="text-emerald-400">{fallbackCounts.passed} passed</span>}
            {fallbackCounts.warnings > 0 && <span className="text-amber-400">{fallbackCounts.warnings} warnings</span>}
            {fallbackCounts.errors > 0 && <span className="text-red-400">{fallbackCounts.errors} failed</span>}
            {fallbackCounts.skipped > 0 && <span className="text-slate-500">{fallbackCounts.skipped} skipped</span>}
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">{fallbackCounts.total} nodes</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Show timeline link */}
        <button
          type="button"
          onClick={onShowTimeline}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition"
        >
          Show live timeline
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-md text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
        >
          ×
        </button>
      </div>

      {/* Category pills — only show if there are issues */}
      {Object.keys(byCat).length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 mr-1">Issues found:</span>
          {(Object.entries(byCat) as [ErrorCategory, number][]).map(([cat, count]) => (
            <span
              key={cat}
              className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', CATEGORY_PILL_COLORS[cat] || CATEGORY_PILL_COLORS.unknown)}
            >
              {count} {CATEGORY_LABELS[cat]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
