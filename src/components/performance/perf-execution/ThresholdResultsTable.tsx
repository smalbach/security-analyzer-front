import type { ThresholdResult } from '../../../types/performance';
import { CopyButton } from '../../ui/CopyButton';

interface ThresholdResultsTableProps {
  results: ThresholdResult[];
}

const SEVERITY_CLASS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
};

export function ThresholdResultsTable({ results }: ThresholdResultsTableProps) {
  if (results.length === 0) {
    return <p className="text-xs text-slate-500">No thresholds configured for this plan.</p>;
  }

  const resultsText = results.map(r =>
    `${r.metric}: ${typeof r.actual === 'number' ? r.actual.toFixed(2) : r.actual} ${r.operator} ${r.threshold} → ${r.passed ? 'PASS' : 'FAIL'}`,
  ).join('\n');

  return (
    <div className="relative group">
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton text={resultsText} />
      </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-white/10 text-left text-slate-400">
          <th className="pb-2 pr-4">Metric</th>
          <th className="pb-2 pr-4">Condition</th>
          <th className="pb-2 pr-4">Actual</th>
          <th className="pb-2 pr-4">Threshold</th>
          <th className="pb-2 pr-4">Severity</th>
          <th className="pb-2">Result</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => (
          <tr key={i} className="border-b border-white/5">
            <td className="py-2 pr-4 text-slate-300">{r.metric}</td>
            <td className="py-2 pr-4 text-slate-400">{r.operator}</td>
            <td className="py-2 pr-4 text-slate-200">{typeof r.actual === 'number' ? r.actual.toFixed(2) : r.actual}</td>
            <td className="py-2 pr-4 text-slate-200">{r.threshold}</td>
            <td className={`py-2 pr-4 ${r.severity ? SEVERITY_CLASS[r.severity] ?? '' : 'text-slate-500'}`}>
              {r.severity ?? '—'}
            </td>
            <td className={`py-2 font-semibold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
              {r.passed ? 'PASS' : 'FAIL'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
