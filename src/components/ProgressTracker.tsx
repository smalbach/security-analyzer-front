import type { AnalysisStatus, StatusResponse } from '../types/api';

type ProgressTrackerProps = {
  analysisId: string;
  status: StatusResponse | null;
  progressPercent: number;
  isPolling: boolean;
};

const STATUS_STYLE: Record<AnalysisStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
  running: 'bg-sky-500/20 text-sky-100 border-sky-300/40',
  completed: 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40',
  failed: 'bg-red-500/20 text-red-100 border-red-300/40',
};

export function ProgressTracker({
  analysisId,
  status,
  progressPercent,
  isPolling,
}: ProgressTrackerProps) {
  const state = status?.status ?? 'pending';
  const statusStyle = STATUS_STYLE[state];

  const detail =
    typeof status?.progress === 'string'
      ? status.progress
      : status?.progress?.detail || status?.summary || 'Sin detalle de progreso';

  const endpointsInfo =
    typeof status?.progress === 'object' && status?.progress
      ? `${status.progress.endpointsTested ?? 0}/${status.progress.endpointsTotal ?? 0} endpoints`
      : null;

  const elapsedInfo =
    typeof status?.progress === 'object' && status?.progress?.elapsedSeconds !== undefined
      ? `${status.progress.elapsedSeconds}s`
      : null;

  return (
    <section className="animate-rise rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Estado de analisis</h2>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${statusStyle}`}>
          {state}
        </span>
      </div>

      <p className="mt-3 break-all text-sm text-slate-300">
        <strong>analysisId:</strong> {analysisId}
      </p>
      <p className="mt-1 text-sm text-slate-200">{detail}</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Progreso</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-tide-500 to-ember-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
        {isPolling ? <span className="badge">Polling cada 5 segundos</span> : null}
        {endpointsInfo ? <span className="badge">{endpointsInfo}</span> : null}
        {elapsedInfo ? <span className="badge">Tiempo: {elapsedInfo}</span> : null}
      </div>

      {status?.summary ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          {status.summary}
        </p>
      ) : null}
    </section>
  );
}
