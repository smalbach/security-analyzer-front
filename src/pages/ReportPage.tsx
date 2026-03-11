import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import type { AnalysisReport, ReportFormat } from '../types/api';
import { ReportDownloads } from '../components/ReportDownloads';
import { JsonReportView } from '../components/JsonReportView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useMemo(() => new ApiClient(API_BASE_URL), []);

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);

  const loadReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await client.getResults(id);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id, client]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDownload = async (format: ReportFormat): Promise<void> => {
    if (!id) return;
    setDownloadingFormat(format);
    setError('');

    try {
      const blob = await client.downloadReport(id, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `security-report-${id}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download report');
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slatewave-900/75 p-8 text-center text-slate-300 shadow-glass backdrop-blur-xl">
        Loading report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Report not found.
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              className="mb-2 text-sm text-tide-300 hover:underline"
              onClick={() => navigate('/')}
            >
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold md:text-3xl">{report.projectName || 'Analysis Report'}</h1>
            <p className="mt-1 break-all text-xs text-slate-300">ID: {report.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="metric-card">
              <p className="metric-label">Endpoints</p>
              <p className="metric-value">{report.totalEndpoints}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Checks</p>
              <p className="metric-value">{report.totalChecks}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Passed</p>
              <p className="metric-value text-emerald-300">{report.totalPassed}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Failed</p>
              <p className="metric-value text-red-300">{report.totalFailed}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="metric-card">
            <p className="metric-label">Critical</p>
            <p className="metric-value text-red-300">{report.criticalCount}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">High</p>
            <p className="metric-value text-orange-300">{report.highCount}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Medium</p>
            <p className="metric-value text-amber-300">{report.mediumCount}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Low</p>
            <p className="metric-value text-teal-300">{report.lowCount}</p>
          </div>
        </div>
      </header>

      <ReportDownloads
        analysisId={report.id}
        downloadingFormat={downloadingFormat}
        onDownload={(format) => void handleDownload(format)}
      />

      <JsonReportView report={report} />
    </div>
  );
}
