import type { AiAnalysis } from '../../types/api';
import { CopyButton } from '../ui/CopyButton';

interface TestRunAiAnalysisProps {
  analysis: AiAnalysis;
}

export function TestRunAiAnalysis({ analysis }: TestRunAiAnalysisProps) {
  const fullText = [
    analysis.executiveSummary,
    ...(analysis.top5Vulnerabilities?.map(
      (v) => `#${v.rank} ${v.title}: ${v.description}`,
    ) || []),
  ].join('\n\n');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-200">AI Analysis</h2>
        <CopyButton text={fullText} size="sm" />
      </div>
      <p className="text-sm text-slate-300">{analysis.executiveSummary}</p>

      {analysis.top5Vulnerabilities?.length ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-400">Top Vulnerabilities</h3>
          <div className="space-y-2">
            {analysis.top5Vulnerabilities.map((vulnerability) => (
              <div
                key={vulnerability.rank}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/3 p-3"
              >
                <span className="shrink-0 text-sm font-bold text-tide-400">#{vulnerability.rank}</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{vulnerability.title}</p>
                  <p className="text-xs text-slate-400">{vulnerability.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
