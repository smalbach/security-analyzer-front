import type { AnalysisStatus, StatusResponse, StatusStep } from '../types/api';

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

const STEP_STATUS_STYLE: Record<string, string> = {
  pending: 'border-white/20 bg-white/5 text-slate-300',
  running: 'border-sky-300/40 bg-sky-500/15 text-sky-100',
  completed: 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100',
  failed: 'border-red-300/40 bg-red-500/15 text-red-100',
  skipped: 'border-slate-300/30 bg-slate-500/15 text-slate-200',
};

export function ProgressTracker({
  analysisId,
  status,
  progressPercent,
  isPolling,
}: ProgressTrackerProps) {
  const state = status?.status ?? 'pending';
  const statusStyle = STATUS_STYLE[state];
  const progress =
    typeof status?.progress === 'object' && status.progress ? status.progress : null;

  const detail =
    typeof status?.progress === 'string'
      ? status.progress
      : progress?.detail || status?.summary || 'No progress details available';

  const endpointsInfo =
    progress &&
    typeof progress.endpointsTested === 'number' &&
    typeof progress.endpointsTotal === 'number'
      ? `${progress.endpointsTested}/${progress.endpointsTotal} endpoints`
      : null;

  const elapsedInfo =
    progress && typeof progress.elapsedSeconds === 'number'
      ? `${progress.elapsedSeconds}s`
      : null;

  const stepInfo =
    progress && typeof progress.currentStep === 'number' && typeof progress.totalSteps === 'number'
      ? `Step ${progress.currentStep}/${progress.totalSteps}`
      : null;

  const phaseInfo = progress?.phase ? `Phase: ${progress.phase}` : null;
  const currentStepLabel = progress?.stepLabel || null;
  const steps = progress?.steps ?? [];

  return (
    <section className="animate-rise rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Analysis Status</h2>
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
          <span>Progress</span>
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
        {isPolling ? <span className="badge">Polling every 5 seconds</span> : null}
        {endpointsInfo ? <span className="badge">{endpointsInfo}</span> : null}
        {elapsedInfo ? <span className="badge">Time: {elapsedInfo}</span> : null}
        {phaseInfo ? <span className="badge">{phaseInfo}</span> : null}
        {stepInfo ? <span className="badge">{stepInfo}</span> : null}
        {currentStepLabel ? <span className="badge">{currentStepLabel}</span> : null}
      </div>

      {status?.summary ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          {status.summary}
        </p>
      ) : null}

      {status?.error ? (
        <p className="mt-3 rounded-xl border border-red-300/40 bg-red-500/15 p-3 text-sm text-red-100">
          {status.error}
        </p>
      ) : null}

      {steps.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-sm font-semibold text-slate-100">Step Pipeline</p>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {steps.map((step) => (
              <div key={`${step.step}-${step.label}`} className="flex items-start gap-2">
                <span className="badge">{step.step}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-100">{step.label}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${getStepStatusStyle(step.status)}`}>
                    {step.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getStepStatusStyle(stepStatus: StatusStep['status']): string {
  return STEP_STATUS_STYLE[stepStatus] || STEP_STATUS_STYLE.pending;
}
