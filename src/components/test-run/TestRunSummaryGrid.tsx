import type { AiAnalysis, TestRunSummary } from '../../types/api';
import { MetricCard } from '../ui';
import { RISK_COLOR } from './constants';
import { ScoreCircle } from './ScoreCircle';

interface TestRunSummaryGridProps {
  summary: TestRunSummary;
  aiAnalysis?: AiAnalysis | null;
}

export function TestRunSummaryGrid({ summary, aiAnalysis }: TestRunSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {summary.securityScore !== undefined ? (
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-1">
          <ScoreCircle score={summary.securityScore} />
          <div>
            <p className="text-xs text-slate-500">Score</p>
            {aiAnalysis ? (
              <p className={`text-sm font-semibold ${RISK_COLOR[aiAnalysis.globalRiskLevel]}`}>
                {aiAnalysis.globalRiskLevel}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <MetricCard label="Endpoints" value={summary.totalEndpoints} />
      <MetricCard label="Checks" value={summary.totalChecks} />
      <MetricCard label="Passed" value={summary.totalPassed} valueClassName="text-emerald-400" />
      <MetricCard label="Failed" value={summary.totalFailed} valueClassName="text-red-400" />
      <MetricCard label="Critical" value={summary.criticalCount} valueClassName="text-red-400" />
    </div>
  );
}
