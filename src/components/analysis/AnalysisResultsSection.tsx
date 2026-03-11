import type { AnalysisReport, ReportFormat } from '../../types/api';
import { JsonReportView } from '../JsonReportView';
import { ReportDownloads } from '../ReportDownloads';

interface AnalysisResultsSectionProps {
  analysisId: string;
  downloadingFormat: ReportFormat | null;
  isFetchingResults: boolean;
  report: AnalysisReport | null;
  onDownload: (format: ReportFormat) => void;
}

export function AnalysisResultsSection({
  analysisId,
  downloadingFormat,
  isFetchingResults,
  report,
  onDownload,
}: AnalysisResultsSectionProps) {
  return (
    <section className="space-y-6">
      <ReportDownloads
        analysisId={analysisId}
        downloadingFormat={downloadingFormat}
        onDownload={onDownload}
      />

      {isFetchingResults ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          Loading JSON report...
        </div>
      ) : null}

      {report ? <JsonReportView report={report} /> : null}
    </section>
  );
}
