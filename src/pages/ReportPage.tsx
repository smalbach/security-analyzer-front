import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import type { AnalysisReport, ReportFormat } from '../types/api';
import { ReportDownloads } from '../components/ReportDownloads';
import { JsonReportView } from '../components/JsonReportView';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();

  const shareToken = searchParams.get('token');

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);

  // Sharing state
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [currentShareToken, setCurrentShareToken] = useState<string | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = user && report?.userId && user.id === report.userId;

  const loadReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getResults(id, shareToken);
      setReport(result);
      setVisibility(result.visibility ?? 'private');
      setCurrentShareToken(result.shareToken ?? null);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id, api, shareToken]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDownload = async (format: ReportFormat): Promise<void> => {
    if (!id) return;
    setDownloadingFormat(format);
    setError('');

    try {
      const blob = await api.downloadReport(id, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `security-report-${id}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (isUnauthorizedError(downloadError)) {
        return;
      }
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download report');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleToggleVisibility = async () => {
    if (!id) return;
    setIsTogglingVisibility(true);
    try {
      const newVisibility = visibility === 'private' ? 'public' : 'private';
      const result = await api.updateVisibility(id, newVisibility);
      setVisibility(result.visibility as 'private' | 'public');
      setCurrentShareToken(result.shareToken);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleCopyLink = () => {
    if (!currentShareToken || !id) return;
    const shareUrl = `${window.location.origin}/analysis/${id}?token=${currentShareToken}`;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

        {/* Sharing controls (owner only) */}
        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <span className="text-sm text-slate-400">Visibility:</span>
            <button
              type="button"
              onClick={() => void handleToggleVisibility()}
              disabled={isTogglingVisibility}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                visibility === 'public'
                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {isTogglingVisibility ? 'Updating...' : visibility === 'public' ? 'Public' : 'Private'}
            </button>

            {visibility === 'public' && currentShareToken && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg bg-tide-500/20 px-3 py-1.5 text-sm font-medium text-tide-300 transition-colors hover:bg-tide-500/30"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            )}
          </div>
        )}
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
