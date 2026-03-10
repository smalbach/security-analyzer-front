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
          <h2 className="text-2xl font-semibold">Visualizador JSON</h2>
          <p className="text-sm text-slate-300">Proyecto: {report.projectName}</p>
        </div>
        <div className="text-sm text-slate-300">
          <p>Inicio: {formatDate(report.startedAt)}</p>
          <p>Fin: {formatDate(report.completedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Endpoints (global)" value={report.totalEndpoints} />
        <Metric label="Checks (global)" value={report.totalChecks} />
        <Metric label="Checks filtrados" value={filtered.totalChecks} />
        <Metric label="Endpoints filtrados" value={filtered.endpoints.length} />
        <Metric label="Passed filtrados" value={filtered.passedChecks} valueClass="text-emerald-300" />
        <Metric label="Failed filtrados" value={filtered.failedChecks} valueClass="text-red-300" />
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
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p>
            <strong>Riesgo global:</strong> {report.aiAnalysis.globalRiskLevel}
          </p>
          <p>
            <strong>Score:</strong> {report.aiAnalysis.securityScore}
          </p>
          <p className="mt-2 text-slate-200">{report.aiAnalysis.executiveSummary}</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <h3 className="text-xl font-semibold">Resultados por endpoint</h3>

        {filtered.endpoints.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No hay resultados para los filtros actuales.
          </p>
        ) : (
          filtered.endpoints.map(({ endpoint, checks }) => (
            <details key={endpoint.endpointId} className="rounded-2xl border border-white/10 bg-white/5 p-4" open>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
                      {endpoint.method}
                    </p>
                    <p className="break-all text-sm text-slate-100">{endpoint.url}</p>
                  </div>
                  <div className="text-xs text-slate-300">checks visibles: {checks.length}</div>
                </div>
              </summary>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.15em] text-slate-300">
                      <th className="border-b border-white/10 py-2 pr-3">Rule</th>
                      <th className="border-b border-white/10 py-2 pr-3">Categoria</th>
                      <th className="border-b border-white/10 py-2 pr-3">Resultado</th>
                      <th className="border-b border-white/10 py-2 pr-3">Severidad</th>
                      <th className="border-b border-white/10 py-2">Finding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr key={`${endpoint.endpointId}-${check.ruleId}-${check.finding}`}>
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
            </details>
          ))
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
