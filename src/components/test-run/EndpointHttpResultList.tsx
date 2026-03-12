import type { HttpTestResult } from '../../types/api';

interface EndpointHttpResultListProps {
  httpResults: HttpTestResult[];
  totalCount: number;
}

export function EndpointHttpResultList({ httpResults, totalCount }: EndpointHttpResultListProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">HTTP executions</p>
        <p className="mt-1 text-xs text-slate-400">
          Showing {httpResults.length} of {totalCount}
        </p>
      </div>

      {httpResults.length === 0 ? (
        <p className="text-sm text-slate-500">No HTTP executions match the current filters.</p>
      ) : (
        <div className="grid gap-2">
          {httpResults.map((httpResult, index) => (
            <div
              key={`${httpResult.method}-${httpResult.endpoint}-${httpResult.statusCode}-${index}`}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  {httpResult.testType?.trim() || 'Default'}
                </span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${getStatusTone(httpResult.statusCode, httpResult.error)}`}>
                  {httpResult.statusCode}
                </span>
                <span className="text-xs text-slate-400">{httpResult.responseTime} ms</span>
              </div>
              {httpResult.error ? (
                <p className="mt-2 text-sm text-red-300">{httpResult.error}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusTone(statusCode: number, error?: string): string {
  if (error || statusCode >= 500) {
    return 'border-red-400/30 bg-red-500/10 text-red-300';
  }

  if (statusCode >= 400) {
    return 'border-orange-400/30 bg-orange-500/10 text-orange-300';
  }

  if (statusCode >= 300) {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-200';
  }

  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300';
}
