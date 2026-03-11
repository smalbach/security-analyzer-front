import type { Severity } from '../types/api';
import type { ReportFilters } from '../utils/report-utils';

type JsonReportFiltersProps = {
  filters: ReportFilters;
  endpointOptions: Array<{ value: string; label: string }>;
  methodOptions: string[];
  categoryOptions: string[];
  onChange: (patch: Partial<ReportFilters>) => void;
};

const SEVERITY_OPTIONS: Array<'all' | Severity> = ['all', 'critical', 'high', 'medium', 'low', 'info'];

export function JsonReportFilters({
  filters,
  endpointOptions,
  methodOptions,
  categoryOptions,
  onChange,
}: JsonReportFiltersProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold">JSON Result Filters</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Search</span>
          <input
            className="field"
            placeholder="URL, rule or finding"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Endpoint</span>
          <select
            className="field"
            value={filters.endpointId}
            onChange={(event) => onChange({ endpointId: event.target.value })}
          >
            <option value="all">All</option>
            {endpointOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Method</span>
          <select
            className="field"
            value={filters.method}
            onChange={(event) => onChange({ method: event.target.value })}
          >
            <option value="all">All</option>
            {methodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Severity</span>
          <select
            className="field"
            value={filters.severity}
            onChange={(event) => onChange({ severity: event.target.value as ReportFilters['severity'] })}
          >
            {SEVERITY_OPTIONS.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Result</span>
          <select
            className="field"
            value={filters.result}
            onChange={(event) => onChange({ result: event.target.value as ReportFilters['result'] })}
          >
            <option value="all">All</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select
            className="field"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            <option value="all">All</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
