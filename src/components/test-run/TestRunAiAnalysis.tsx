import type { AiAnalysis } from '../../types/api';

interface TestRunAiAnalysisProps {
  analysis: AiAnalysis;
}

export function TestRunAiAnalysis({ analysis }: TestRunAiAnalysisProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl">
      <h2 className="mb-3 font-semibold text-slate-200">AI Analysis</h2>
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
