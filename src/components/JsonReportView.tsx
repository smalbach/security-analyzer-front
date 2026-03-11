import { useMemo, useState } from 'react';
import type { AnalysisReport, Severity } from '../types/api';
import {
  DEFAULT_REPORT_FILTERS,
  filterReport,
  getCategoryOptions,
  getEndpointOptions,
  getMethodOptions,
  type ReportFilters,
} from '../utils/report-utils';
import { JsonReportFilters } from './JsonReportFilters';

type JsonReportViewProps = {
  report: AnalysisReport;
};

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-200 border-red-300/40',
  high: 'bg-orange-500/20 text-orange-200 border-orange-300/40',
  medium: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
  low: 'bg-teal-500/20 text-teal-100 border-teal-300/40',
  info: 'bg-slate-500/20 text-slate-100 border-slate-300/40',
};

export function JsonReportView({ report }: JsonReportViewProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);

  const endpointOptions = useMemo(() => getEndpointOptions(report), [report]);
  const methodOptions = useMemo(() => getMethodOptions(report), [report]);
  const categoryOptions = useMemo(() => getCategoryOptions(report), [report]);

  const filtered = useMemo(() => filterReport(report, filters), [report, filters]);

  const applyFilterPatch = (patch: Partial<ReportFilters>): void => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">JSON Report Viewer</h2>
          <p className="text-sm text-slate-300">Project: {report.projectName}</p>
        </div>
        <div className="text-sm text-slate-300">
          <p>Started: {formatDate(report.startedAt)}</p>
          <p>Finished: {formatDate(report.completedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Endpoints (total)" value={report.totalEndpoints} />
        <Metric label="Checks (total)" value={report.totalChecks} />
        <Metric label="Filtered checks" value={filtered.totalChecks} />
        <Metric label="Filtered endpoints" value={filtered.endpoints.length} />
        <Metric label="Filtered passed" value={filtered.passedChecks} valueClass="text-emerald-300" />
        <Metric label="Filtered failed" value={filtered.failedChecks} valueClass="text-red-300" />
        <Metric label="Critical" value={filtered.severityCounts.critical} valueClass="text-red-300" />
        <Metric label="High" value={filtered.severityCounts.high} valueClass="text-orange-300" />
      </div>

      <div className="mt-5">
        <JsonReportFilters
          filters={filters}
          endpointOptions={endpointOptions}
          methodOptions={methodOptions}
          categoryOptions={categoryOptions}
          onChange={applyFilterPatch}
        />
      </div>

      {report.aiAnalysis ? (
        <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <summary className="cursor-pointer list-none font-semibold text-slate-100">AI Summary</summary>
          <div className="mt-3 space-y-1">
            <p>
              <strong>Global risk:</strong> {report.aiAnalysis.globalRiskLevel}
            </p>
            <p>
              <strong>Score:</strong> {report.aiAnalysis.securityScore}
            </p>
            <p className="mt-2 text-slate-200">{report.aiAnalysis.executiveSummary}</p>
          </div>
        </details>
      ) : null}

      <div className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-xl font-semibold">Results by endpoint</h3>
          <p className="text-xs text-slate-300">
            Showing {filtered.endpoints.length} endpoint(s)
          </p>
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
                              <span className={`rounded-full border px-2 py-0.5 text-xs ${check.passed ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-200' : 'border-red-300/40 bg-red-500/15 text-red-200'}`}>
                                {check.passed ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                            <td className="border-b border-white/10 py-2 pr-3">
                              <span className={`rounded-full border px-2 py-0.5 text-xs uppercase ${SEVERITY_CLASS[check.severity]}`}>
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
    </section>
  );
}

type MetricProps = {
  label: string;
  value: number;
  valueClass?: string;
};

function Metric({ label, value, valueClass }: MetricProps) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className={`metric-value ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}

function formatDate(dateIso?: string): string {
  if (!dateIso) {
    return '-';
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return dateIso;
  }

  return date.toLocaleString();
}
