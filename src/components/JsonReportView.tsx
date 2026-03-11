import { useMemo, useState } from 'react';
import type { AnalysisReport } from '../types/api';
import {
  DEFAULT_REPORT_FILTERS,
  filterReport,
  getCategoryOptions,
  getEndpointOptions,
  getMethodOptions,
  type ReportFilters,
} from '../utils/report-utils';
import { JsonReportAiSummary, JsonReportEndpointResults, formatReportDate } from './report';
import { JsonReportFilters } from './JsonReportFilters';
import { MetricCard } from './ui';

type JsonReportViewProps = {
  report: AnalysisReport;
};

export function JsonReportView({ report }: JsonReportViewProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);

  const endpointOptions = useMemo(() => getEndpointOptions(report), [report]);
  const methodOptions = useMemo(() => getMethodOptions(report), [report]);
  const categoryOptions = useMemo(() => getCategoryOptions(report), [report]);
  const filtered = useMemo(() => filterReport(report, filters), [report, filters]);

  const applyFilterPatch = (patch: Partial<ReportFilters>) => {
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
          <p>Started: {formatReportDate(report.startedAt)}</p>
          <p>Finished: {formatReportDate(report.completedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Endpoints (total)" value={report.totalEndpoints} />
        <MetricCard label="Checks (total)" value={report.totalChecks} />
        <MetricCard label="Filtered checks" value={filtered.totalChecks} />
        <MetricCard label="Filtered endpoints" value={filtered.endpoints.length} />
        <MetricCard label="Filtered passed" value={filtered.passedChecks} valueClassName="text-emerald-300" />
        <MetricCard label="Filtered failed" value={filtered.failedChecks} valueClassName="text-red-300" />
        <MetricCard label="Critical" value={filtered.severityCounts.critical} valueClassName="text-red-300" />
        <MetricCard label="High" value={filtered.severityCounts.high} valueClassName="text-orange-300" />
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

      {report.aiAnalysis ? <JsonReportAiSummary analysis={report.aiAnalysis} /> : null}
      <JsonReportEndpointResults filtered={filtered} />
    </section>
  );
}
