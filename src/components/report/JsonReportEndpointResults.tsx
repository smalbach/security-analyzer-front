import type { FilteredReport } from '../../utils/report-utils';
import { REPORT_SEVERITY_CLASS } from './constants';

interface JsonReportEndpointResultsProps {
  filtered: FilteredReport;
}

export function JsonReportEndpointResults({ filtered }: JsonReportEndpointResultsProps) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-xl font-semibold">Results by endpoint</h3>
        <p className="text-xs text-slate-300">Showing {filtered.endpoints.length} endpoint(s)</p>
      </div>

      {filtered.endpoints.length === 0 ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          No results match the current filters.
        </p>
      ) : (
        <div className="mt-3 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {filtered.endpoints.map(({ endpoint, checks }) => (
            <details key={endpoint.endpointId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
                      {endpoint.method}
                    </p>
                    <p className="break-all text-sm text-slate-100">{endpoint.url}</p>
                  </div>
                  <div className="text-xs text-slate-300">visible checks: {checks.length}</div>
                </div>
              </summary>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead className="sticky top-0 bg-slatewave-900/95 backdrop-blur">
                      <tr className="text-left text-xs uppercase tracking-[0.15em] text-slate-300">
                        <th className="border-b border-white/10 py-2 pr-3">Rule</th>
                        <th className="border-b border-white/10 py-2 pr-3">Category</th>
                        <th className="border-b border-white/10 py-2 pr-3">Result</th>
                        <th className="border-b border-white/10 py-2 pr-3">Severity</th>
                        <th className="border-b border-white/10 py-2">Finding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checks.map((check) => (
                        <tr key={`${endpoint.endpointId}-${check.ruleId}-${check.finding}`} className="align-top">
                          <td className="border-b border-white/10 py-2 pr-3">{check.ruleName}</td>
                          <td className="border-b border-white/10 py-2 pr-3">{check.category}</td>
                          <td className="border-b border-white/10 py-2 pr-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                check.passed
                                  ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-200'
                                  : 'border-red-300/40 bg-red-500/15 text-red-200'
                              }`}
                            >
                              {check.passed ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                          <td className="border-b border-white/10 py-2 pr-3">
                            <span className={`rounded-full border px-2 py-0.5 text-xs uppercase ${REPORT_SEVERITY_CLASS[check.severity]}`}>
                              {check.severity}
                            </span>
                          </td>
                          <td className="border-b border-white/10 py-2">{check.finding}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
