import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { AnalysisHero, AnalysisPreviewSection, AnalysisResultsSection } from '../components/analysis';
import { PreviewFileForm, type PreviewFormValues } from '../components/PreviewFileForm';
import { ProgressTracker } from '../components/ProgressTracker';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { ApiClient } from '../lib/api';
import type { AnalysisReport, PreviewAndStartResponse, ReportFormat } from '../types/api';
import { getPreviewGetEndpoints } from '../utils/preview-utils';

const INITIAL_FORM: PreviewFormValues = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
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
    if (!activeAnalysisId) {
      return;
    }

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
      if (nextStatus.summary && typeof nextStatus.summary === 'string') {
        setInfo(nextStatus.summary);
      }
    },
    onCompleted: () => {
      setShouldPoll(false);
      void loadResults();
    },
    onFailed: (nextStatus) => {
      setShouldPoll(false);
      setError(
        nextStatus.error ||
          (typeof nextStatus.summary === 'string' ? nextStatus.summary : undefined) ||
          'Analysis failed. Check backend logs.',
      );
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

  const analysisLinks = useMemo(() => {
    if (!activeAnalysisId) {
      return null;
    }

    const baseUrl = formValues.apiBaseUrl.replace(/\/$/, '');
    return {
      status: `${baseUrl}/analysis/${activeAnalysisId}/status`,
      results: `${baseUrl}/analysis/${activeAnalysisId}/results`,
      reportJson: `${baseUrl}/analysis/${activeAnalysisId}/report/json`,
      reportHtml: `${baseUrl}/analysis/${activeAnalysisId}/report/html`,
      reportPdf: `${baseUrl}/analysis/${activeAnalysisId}/report/pdf`,
    };
  }, [activeAnalysisId, formValues.apiBaseUrl]);

  const onFormChange = (patch: Partial<PreviewFormValues>) => {
    setFormValues((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

  const handleDownload = async (format: ReportFormat) => {
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
      <AnalysisHero />

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
        <AnalysisPreviewSection
          previewStart={previewStart}
          previewGetEndpoints={previewGetEndpoints}
          analysisLinks={analysisLinks}
        />
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
        <AnalysisResultsSection
          analysisId={activeAnalysisId}
          downloadingFormat={downloadingFormat}
          isFetchingResults={isFetchingResults}
          report={report}
          onDownload={(format) => void handleDownload(format)}
        />
      ) : null}
    </div>
  );
}
