import type { PerfComparisonReport } from '../../../types/performance';

interface PerfComparisonViewProps {
  report: PerfComparisonReport;
}

export function PerfComparisonView({ report }: PerfComparisonViewProps) {
  const verdictColor = {
    improved: 'text-green-400',
    degraded: 'text-red-400',
    neutral: 'text-slate-400',
  }[report.verdict];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-400">
          <span className="font-medium text-slate-200">{report.baseline.planName}</span>
          {' vs '}
          <span className="font-medium text-slate-200">{report.candidate.planName}</span>
        </div>
        <span className={`ml-auto text-sm font-semibold capitalize ${verdictColor}`}>
          {report.verdict}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-400">
            <th className="pb-2 pr-4">Metric</th>
            <th className="pb-2 pr-4">Baseline</th>
            <th className="pb-2 pr-4">Candidate</th>
            <th className="pb-2 pr-4">Delta</th>
            <th className="pb-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {report.metrics.map((m) => (
            <tr key={m.metric} className="border-b border-white/5">
              <td className="py-2 pr-4 text-slate-300">{m.metric}</td>
              <td className="py-2 pr-4 text-slate-400">{m.baseline.toFixed(2)}</td>
              <td className="py-2 pr-4 text-slate-200">{m.candidate.toFixed(2)}</td>
              <td className={`py-2 pr-4 ${m.improved ? 'text-green-400' : m.delta !== 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {m.delta > 0 ? '+' : ''}{m.delta.toFixed(2)}
              </td>
              <td className={`py-2 ${m.improved ? 'text-green-400' : m.delta !== 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {m.delta !== 0 ? `${m.deltaPercent > 0 ? '+' : ''}${m.deltaPercent.toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
