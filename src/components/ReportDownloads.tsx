import type { ReportFormat } from '../types/api';

type ReportDownloadsProps = {
  analysisId: string;
  downloadingFormat: ReportFormat | null;
  onDownload: (format: ReportFormat) => void;
};

export function ReportDownloads({
  analysisId,
  downloadingFormat,
  onDownload,
}: ReportDownloadsProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
      <h2 className="text-xl font-semibold">Descarga de reportes</h2>
      <p className="mt-2 break-all text-sm text-slate-300">
        analysisId: <strong>{analysisId}</strong>
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="btn-secondary"
          disabled={downloadingFormat !== null}
          onClick={() => onDownload('json')}
        >
          {downloadingFormat === 'json' ? 'Descargando...' : 'Descargar JSON'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          disabled={downloadingFormat !== null}
          onClick={() => onDownload('html')}
        >
          {downloadingFormat === 'html' ? 'Descargando...' : 'Descargar HTML'}
        </button>

        <button
          type="button"
          className="btn-secondary"
          disabled={downloadingFormat !== null}
          onClick={() => onDownload('pdf')}
        >
          {downloadingFormat === 'pdf' ? 'Descargando...' : 'Descargar PDF'}
        </button>
      </div>
    </section>
  );
}
