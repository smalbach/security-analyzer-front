import type { ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import { CATEGORY_LABELS } from '../../../lib/errorDiagnosis';

const CATEGORY_COLORS: Record<string, string> = {
  network: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  auth: 'border-red-500/20 bg-red-500/10 text-red-400',
  http_status: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  config: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  script: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  schema: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
  assertion: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  unknown: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
};

const STEP_ICONS: Record<string, string> = {
  check: '🔍',
  fix: '🔧',
  verify: '✅',
};

interface ReportErrorDiagnosisProps {
  diagnosis: ErrorDiagnosis;
  onFixThis: () => void;
}

export function ReportErrorDiagnosis({ diagnosis, onFixThis }: ReportErrorDiagnosisProps) {
  return (
    <div className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-3 space-y-2.5">
      {/* Category + Title */}
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[diagnosis.category] || CATEGORY_COLORS.unknown}`}>
          {CATEGORY_LABELS[diagnosis.category]}
        </span>
        <span className="text-sm font-semibold text-red-300">{diagnosis.title}</span>
      </div>

      {/* Explanation */}
      <div>
        <div className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">What happened</div>
        <p className="text-[11px] text-slate-300 leading-relaxed">{diagnosis.explanation}</p>
      </div>

      {/* Cause */}
      <div>
        <div className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Why</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{diagnosis.cause}</p>
      </div>

      {/* Fix steps */}
      <div>
        <div className="text-[10px] font-semibold uppercase text-slate-500 mb-1">How to fix it</div>
        <ol className="space-y-1">
          {diagnosis.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px]">
              <span className="mt-0.5 shrink-0 text-[11px]">{STEP_ICONS[step.type] || '•'}</span>
              <span className="text-slate-300">{step.instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* API Response — shows what the target API actually returned */}
      {(diagnosis.apiErrorMessage || diagnosis.responseBody != null) && (
        <div>
          <div className="text-[10px] font-semibold uppercase text-slate-500 mb-1">API Response</div>
          <div className="rounded bg-black/30 p-2 space-y-1.5">
            {diagnosis.responseStatus != null && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-medium text-slate-400">Status:</span>
                <span className={
                  diagnosis.responseStatus >= 500 ? 'font-mono text-red-400' :
                  diagnosis.responseStatus >= 400 ? 'font-mono text-amber-400' :
                  'font-mono text-emerald-400'
                }>
                  {diagnosis.responseStatus}
                </span>
              </div>
            )}
            {diagnosis.apiErrorMessage && (
              <div className="text-[11px]">
                <span className="font-medium text-slate-400">Message: </span>
                <span className="text-red-300">{diagnosis.apiErrorMessage}</span>
              </div>
            )}
            {diagnosis.responseBody != null && (
              <pre className="max-h-[120px] overflow-auto text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all">
                {typeof diagnosis.responseBody === 'string'
                  ? diagnosis.responseBody
                  : JSON.stringify(diagnosis.responseBody, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Fix this button */}
      <button
        type="button"
        onClick={onFixThis}
        className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-400 transition hover:bg-sky-500/20 hover:text-sky-300"
      >
        Fix this →
      </button>
    </div>
  );
}
