import { Button, Select } from '../ui';
import type { FilteredTestRunSummary, TestRunFilterOptions, TestRunFilterState } from './filtering';

interface TestRunFiltersProps {
  filters: TestRunFilterState;
  options: TestRunFilterOptions;
  summary: FilteredTestRunSummary;
  hasActiveFilters: boolean;
  onChange: (patch: Partial<TestRunFilterState>) => void;
  onReset: () => void;
}

export function TestRunFilters({
  filters,
  options,
  summary,
  hasActiveFilters,
  onChange,
  onReset,
}: TestRunFiltersProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Result filters</h2>
          <p className="mt-1 text-sm text-slate-400">
            Selectors update automatically based on the current results and active filters.
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-300">
            Showing {summary.endpoints} of {summary.totalEndpoints} endpoints
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.visibleChecks} of {summary.totalChecks} checks | {summary.visibleHttpResults} of {summary.totalHttpResults} HTTP runs
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.failedChecks} failed | {summary.criticalFindings} critical | {summary.highFindings} high
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sort</span>
          <Select value={filters.sortBy} onChange={(event) => onChange({ sortBy: event.target.value as TestRunFilterState['sortBy'] })}>
            {options.sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Method</span>
          <Select value={filters.method} onChange={(event) => onChange({ method: event.target.value })}>
            <option value="">All methods</option>
            {options.methods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Endpoint</span>
          <Select value={filters.endpointId} onChange={(event) => onChange({ endpointId: event.target.value })}>
            <option value="">All endpoints</option>
            {options.endpoints.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Result state</span>
          <Select value={filters.resultState} onChange={(event) => onChange({ resultState: event.target.value as TestRunFilterState['resultState'] })}>
            <option value="">All states</option>
            {options.resultStates.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Check status</span>
          <Select value={filters.checkStatus} onChange={(event) => onChange({ checkStatus: event.target.value as TestRunFilterState['checkStatus'] })}>
            <option value="">All checks</option>
            {options.checkStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Severity</span>
          <Select value={filters.severity} onChange={(event) => onChange({ severity: event.target.value as TestRunFilterState['severity'] })}>
            <option value="">All severities</option>
            {options.severities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Category</span>
          <Select value={filters.category} onChange={(event) => onChange({ category: event.target.value })}>
            <option value="">All categories</option>
            {options.categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rule</span>
          <Select value={filters.ruleId} onChange={(event) => onChange({ ruleId: event.target.value })}>
            <option value="">All rules</option>
            {options.rules.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">HTTP family</span>
          <Select value={filters.httpStatusFamily} onChange={(event) => onChange({ httpStatusFamily: event.target.value })}>
            <option value="">All families</option>
            {options.httpStatusFamilies.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">HTTP status</span>
          <Select value={filters.httpStatus} onChange={(event) => onChange({ httpStatus: event.target.value })}>
            <option value="">All statuses</option>
            {options.httpStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Test type</span>
          <Select value={filters.testType} onChange={(event) => onChange({ testType: event.target.value })}>
            <option value="">All test types</option>
            {options.testTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onReset} disabled={!hasActiveFilters}>
          Reset filters
        </Button>
      </div>
    </section>
  );
}
