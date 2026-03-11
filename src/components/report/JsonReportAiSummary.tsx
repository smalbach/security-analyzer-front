import type { AiAnalysis } from '../../types/api';

interface JsonReportAiSummaryProps {
  analysis: AiAnalysis;
}

export function JsonReportAiSummary({ analysis }: JsonReportAiSummaryProps) {
  return (
    <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
      <summary className="cursor-pointer list-none font-semibold text-slate-100">AI Summary</summary>
      <div className="mt-3 space-y-1">
        <p>
          <strong>Global risk:</strong> {analysis.globalRiskLevel}
        </p>
        <p>
          <strong>Score:</strong> {analysis.securityScore}
        </p>
        <p className="mt-2 text-slate-200">{analysis.executiveSummary}</p>
      </div>
    </details>
  );
}
