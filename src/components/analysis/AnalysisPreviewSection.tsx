import type { PreviewAndStartResponse, PreviewEndpoint } from '../../types/api';
import { MetricCard } from '../ui';
import { PreviewGetEndpointsPanel } from '../PreviewGetEndpointsPanel';

interface AnalysisLinks {
  status: string;
  results: string;
  reportJson: string;
  reportHtml: string;
  reportPdf: string;
}

interface AnalysisPreviewSectionProps {
  previewStart: PreviewAndStartResponse;
  previewGetEndpoints: PreviewEndpoint[];
  analysisLinks: AnalysisLinks | null;
}

export function AnalysisPreviewSection({
  previewStart,
  previewGetEndpoints,
  analysisLinks,
}: AnalysisPreviewSectionProps) {
  return (
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
        <MetricCard label="Total endpoints" value={previewStart.preview.totalEndpoints} />
        <MetricCard label="Total users" value={previewStart.preview.totalUsers} />
        <MetricCard label="GET methods (preview)" value={previewGetEndpoints.length} />
      </div>

      {analysisLinks ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <h3 className="font-semibold">Query endpoints</h3>
          <ul className="mt-2 space-y-1 break-all text-slate-200">
            <li>
              <a className="text-tide-300 hover:underline" href={analysisLinks.status} target="_blank" rel="noreferrer">
                status
              </a>
            </li>
            <li>
              <a className="text-tide-300 hover:underline" href={analysisLinks.results} target="_blank" rel="noreferrer">
                results
              </a>
            </li>
            <li>
              <a className="text-tide-300 hover:underline" href={analysisLinks.reportJson} target="_blank" rel="noreferrer">
                report json
              </a>
            </li>
            <li>
              <a className="text-tide-300 hover:underline" href={analysisLinks.reportHtml} target="_blank" rel="noreferrer">
                report html
              </a>
            </li>
            <li>
              <a className="text-tide-300 hover:underline" href={analysisLinks.reportPdf} target="_blank" rel="noreferrer">
                report pdf
              </a>
            </li>
          </ul>
        </div>
      ) : null}

      {previewGetEndpoints.length ? <PreviewGetEndpointsPanel endpoints={previewGetEndpoints} /> : null}
    </section>
  );
}
