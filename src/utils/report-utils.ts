import type { AnalysisReport, EndpointTestResult, SecurityCheck, Severity } from '../types/api';

export type ReportFilters = {
  endpointId: string;
  method: string;
  severity: 'all' | Severity;
  result: 'all' | 'pass' | 'fail';
  category: string;
  search: string;
};

export type FilteredEndpoint = {
  endpoint: EndpointTestResult;
  checks: SecurityCheck[];
};

export type FilteredReport = {
  endpoints: FilteredEndpoint[];
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  severityCounts: Record<Severity, number>;
};

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  endpointId: 'all',
  method: 'all',
  severity: 'all',
  result: 'all',
  category: 'all',
  search: '',
};

export function getEndpointOptions(report: AnalysisReport): Array<{ value: string; label: string }> {
  return report.endpointResults.map((endpoint) => ({
    value: endpoint.endpointId,
    label: `${endpoint.method} ${endpoint.url}`,
  }));
}

export function getMethodOptions(report: AnalysisReport): string[] {
  const methods = new Set<string>();
  for (const endpoint of report.endpointResults) {
    methods.add(endpoint.method);
  }
  return Array.from(methods).sort();
}

export function getCategoryOptions(report: AnalysisReport): string[] {
  const categories = new Set<string>();
  for (const endpoint of report.endpointResults) {
    for (const check of endpoint.checks) {
      categories.add(check.category);
    }
  }
  return Array.from(categories).sort();
}

export function filterReport(report: AnalysisReport, filters: ReportFilters): FilteredReport {
  const normalizedSearch = filters.search.trim().toLowerCase();

  const endpoints: FilteredEndpoint[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const endpoint of report.endpointResults) {
    if (filters.endpointId !== 'all' && endpoint.endpointId !== filters.endpointId) {
      continue;
    }

    if (filters.method !== 'all' && endpoint.method !== filters.method) {
      continue;
    }

    const checks = endpoint.checks.filter((check) => {
      if (filters.severity !== 'all' && check.severity !== filters.severity) {
        return false;
      }

      if (filters.result === 'pass' && !check.passed) {
        return false;
      }

      if (filters.result === 'fail' && check.passed) {
        return false;
      }

      if (filters.category !== 'all' && check.category !== filters.category) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${endpoint.url} ${check.ruleName} ${check.finding} ${check.description}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    if (checks.length === 0) {
      continue;
    }

    endpoints.push({ endpoint, checks });

    for (const check of checks) {
      totalChecks += 1;
      if (check.passed) {
        passedChecks += 1;
      } else {
        failedChecks += 1;
      }
      severityCounts[check.severity] += 1;
    }
  }

  return {
    endpoints,
    totalChecks,
    passedChecks,
    failedChecks,
    severityCounts,
  };
}
