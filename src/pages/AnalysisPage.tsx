import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiClient } from '../lib/api';
import type {
  AnalysisReport,
  PreviewAndStartResponse,
  ReportFormat,
} from '../types/api';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import {
  PreviewFileForm,
  type PreviewFormValues,
} from '../components/PreviewFileForm';
import { ProgressTracker } from '../components/ProgressTracker';
import { ReportDownloads } from '../components/ReportDownloads';
import { JsonReportView } from '../components/JsonReportView';
import { PreviewGetEndpointsPanel } from '../components/PreviewGetEndpointsPanel';
import { getPreviewGetEndpoints } from '../utils/preview-utils';

const INITIAL_FORM: PreviewFormValues = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  baseUrlOverride: '',
  projectName: '',
  crossUserPermutations: true,
  testInjections: true,
  testRateLimit: true,
  requestTimeout: '10000',
};

export function AnalysisPage() {
  const [formValues, setFormValues] = useState<PreviewFormValues>(INITIAL_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [previewStart, setPreviewStart] = useState<PreviewAndStartResponse | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);

  const client = useMemo(() => new ApiClient(formValues.apiBaseUrl), [formValues.apiBaseUrl]);

  const loadResults = useCallback(async () => {
    if (!activeAnalysisId) return;

    setIsFetchingResults(true);
    try {
      const nextReport = await client.getResults(activeAnalysisId);
      setReport(nextReport);
      setInfo('Analysis completed. JSON report loaded.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load JSON report');
    } finally {
      setIsFetchingResults(false);
    }
  }, [activeAnalysisId, client]);

  const polling = useAnalysisPolling({
    baseUrl: formValues.apiBaseUrl,
    analysisId: activeAnalysisId,
    enabled: shouldPoll,
    onStatus: (nextStatus) => {
      if (nextStatus.summary) setInfo(nextStatus.summary);
    },
    onCompleted: () => {
      setShouldPoll(false);
      void loadResults();
    },
    onFailed: (nextStatus) => {
      setShouldPoll(false);
      setError(nextStatus.error || nextStatus.summary || 'Analysis failed. Check backend logs.');
    },
    onError: (message) => {
      setShouldPoll(false);
      setError(message);
    },
  });

  const previewGetEndpoints = useMemo(
    () => getPreviewGetEndpoints(previewStart?.preview),
    [previewStart],
  );

  const getAnalysisLinks = useMemo(() => {
    if (!activeAnalysisId) return null;
    const base = formValues.apiBaseUrl.replace(/\/$/, '');
    return {
      status: `${base}/analysis/${activeAnalysisId}/status`,
      results: `${base}/analysis/${activeAnalysisId}/results`,
      reportJson: `${base}/analysis/${activeAnalysisId}/report/json`,
      reportHtml: `${base}/analysis/${activeAnalysisId}/report/html`,
      reportPdf: `${base}/analysis/${activeAnalysisId}/report/pdf`,
    };
  }, [activeAnalysisId, formValues.apiBaseUrl]);

  const onFormChange = (patch: Partial<PreviewFormValues>): void => {
    setFormValues((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Please select a file before submitting.');
      return;
    }

    let timeoutValue: number | undefined;
    const timeoutTrimmed = formValues.requestTimeout.trim();

    if (timeoutTrimmed) {
      timeoutValue = Number(timeoutTrimmed);
      if (!Number.isFinite(timeoutValue) || timeoutValue <= 0) {
        setError('requestTimeout must be a number greater than 0.');
        return;
      }
    }

    setError('');
    setInfo('');
    setReport(null);
    setPreviewStart(null);
    setIsSubmitting(true);

    try {
      const response = await client.previewFile({
        file: selectedFile,
        baseUrl: formValues.baseUrlOverride,
        projectName: formValues.projectName,
        crossUserPermutations: formValues.crossUserPermutations,
        testInjections: formValues.testInjections,
        testRateLimit: formValues.testRateLimit,
        requestTimeout: timeoutValue,
      });

      setPreviewStart(response);
      setInfo(response.message || 'File processed successfully.');

      if (response.analysisId && response.analysisId !== 'N/A') {
        setActiveAnalysisId(response.analysisId);
        setShouldPoll(true);
      }
    } catch (submitError) {
      setShouldPoll(false);
      setError(submitError instanceof Error ? submitError.message : 'Failed to process file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (format: ReportFormat): Promise<void> => {
    if (!activeAnalysisId) {
      setError('No analysisId available for downloading reports.');
      return;
    }

    setDownloadingFormat(format);
    setError('');

    try {
      const blob = await client.downloadReport(activeAnalysisId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `security-report-${activeAnalysisId}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setInfo(`${format.toUpperCase()} report downloaded.`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download report');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide-400">
          API Security Analyzer
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">File-Based Security Analysis</h1>
        <p className="mt-2 text-sm text-slate-200/85 md:text-base">
          Upload a file to <code>POST /analysis/preview-file</code>, receive real-time updates via WebSocket, and view the final JSON report with filters.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
          {info}
        </div>
      ) : null}

      <PreviewFileForm
        values={formValues}
        selectedFileName={selectedFile?.name ?? ''}
        isSubmitting={isSubmitting}
        onChange={onFormChange}
        onFileChange={setSelectedFile}
        onSubmit={(event) => void handleSubmit(event)}
      />

      {previewStart ? (
        <section className="rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
          <h2 className="text-xl font-semibold">Initial Preview</h2>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <p>
              <strong>analysisId:</strong> {previewStart.analysisId}
            </p>
            <p className="mt-1">
              <strong>baseUrl:</strong> {previewStart.preview.baseUrl}
            </p>
            <p className="mt-1">
              <strong>sections:</strong>{' '}
              {previewStart.preview.sections.length ? previewStart.preview.sections.join(' | ') : '-'}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Total endpoints" value={previewStart.preview.totalEndpoints} />
            <Metric label="Total users" value={previewStart.preview.totalUsers} />
            <Metric label="GET methods (preview)" value={previewGetEndpoints.length} />
          </div>

          {getAnalysisLinks ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <h3 className="font-semibold">Query endpoints</h3>
              <ul className="mt-2 space-y-1 break-all text-slate-200">
                <li>
                  <a className="text-tide-300 hover:underline" href={getAnalysisLinks.status} target="_blank" rel="noreferrer">
                    status
                  </a>
                </li>
                <li>
                  <a className="text-tide-300 hover:underline" href={getAnalysisLinks.results} target="_blank" rel="noreferrer">
                    results
                  </a>
                </li>
                <li>
                  <a className="text-tide-300 hover:underline" href={getAnalysisLinks.reportJson} target="_blank" rel="noreferrer">
                    report json
                  </a>
                </li>
                <li>
                  <a className="text-tide-300 hover:underline" href={getAnalysisLinks.reportHtml} target="_blank" rel="noreferrer">
                    report html
                  </a>
                </li>
                <li>
                  <a className="text-tide-300 hover:underline" href={getAnalysisLinks.reportPdf} target="_blank" rel="noreferrer">
                    report pdf
                  </a>
                </li>
              </ul>
            </div>
          ) : null}

          {previewGetEndpoints.length > 0 ? (
            <PreviewGetEndpointsPanel endpoints={previewGetEndpoints} />
          ) : null}
        </section>
      ) : null}

      {activeAnalysisId ? (
        <ProgressTracker
          analysisId={activeAnalysisId}
          status={polling.status}
          progressPercent={polling.progressPercent}
          isPolling={polling.isPolling}
        />
      ) : null}

      {polling.status?.status === 'completed' ? (
        <section className="space-y-6">
          <ReportDownloads
            analysisId={activeAnalysisId}
            downloadingFormat={downloadingFormat}
            onDownload={(format) => void handleDownload(format)}
          />

          {isFetchingResults ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              Loading JSON report...
            </div>
          ) : null}

          {report ? <JsonReportView report={report} /> : null}
        </section>
      ) : null}
    </div>
  );
}

type MetricProps = {
  label: string;
  value: number;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}
