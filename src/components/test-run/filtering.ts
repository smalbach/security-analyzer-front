import type { EndpointTestResult, HttpTestResult, SecurityCheck, Severity } from '../../types/api';

export type ResultStateFilter = '' | 'clean' | 'with_findings' | 'critical_high' | 'http_errors';
export type CheckStatusFilter = '' | 'passed' | 'failed';
export type TestRunSortOption =
  | 'risk_desc'
  | 'failures_desc'
  | 'health_desc'
  | 'health_asc'
  | 'recent_desc'
  | 'endpoint_asc';

export interface TestRunFilterState {
  method: string;
  endpointId: string;
  resultState: ResultStateFilter;
  severity: Severity | '';
  category: string;
  ruleId: string;
  checkStatus: CheckStatusFilter;
  httpStatusFamily: string;
  httpStatus: string;
  testType: string;
  sortBy: TestRunSortOption;
}

export interface TestRunFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface TestRunFilterOptions {
  methods: TestRunFilterOption[];
  endpoints: TestRunFilterOption[];
  resultStates: TestRunFilterOption[];
  severities: TestRunFilterOption[];
  categories: TestRunFilterOption[];
  rules: TestRunFilterOption[];
  checkStatuses: TestRunFilterOption[];
  httpStatusFamilies: TestRunFilterOption[];
  httpStatuses: TestRunFilterOption[];
  testTypes: TestRunFilterOption[];
  sortOptions: Array<{ value: TestRunSortOption; label: string }>;
}

export interface FilteredEndpointResult extends EndpointTestResult {
  totalCheckCount: number;
  totalHttpResultCount: number;
  visibleCheckCount: number;
  visibleHttpResultCount: number;
  hiddenCheckCount: number;
  hiddenHttpResultCount: number;
}

export interface FilteredTestRunSummary {
  endpoints: number;
  totalEndpoints: number;
  visibleChecks: number;
  totalChecks: number;
  visibleHttpResults: number;
  totalHttpResults: number;
  failedChecks: number;
  criticalFindings: number;
  highFindings: number;
}

type FilterKey = keyof TestRunFilterState;

const CHECK_FILTER_KEYS: FilterKey[] = ['severity', 'category', 'ruleId', 'checkStatus'];
const HTTP_FILTER_KEYS: FilterKey[] = ['httpStatusFamily', 'httpStatus', 'testType'];
const FILTER_VALUE_KEYS: Array<Exclude<FilterKey, 'sortBy'>> = [
  'method',
  'endpointId',
  'resultState',
  'severity',
  'category',
  'ruleId',
  'checkStatus',
  'httpStatusFamily',
  'httpStatus',
  'testType',
];

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

const RESULT_STATE_DEFINITIONS: Array<{ value: Exclude<ResultStateFilter, ''>; label: string }> = [
  { value: 'with_findings', label: 'With findings' },
  { value: 'clean', label: 'Clean' },
  { value: 'critical_high', label: 'Critical / High' },
  { value: 'http_errors', label: 'HTTP errors' },
];

const CHECK_STATUS_DEFINITIONS: Array<{ value: Exclude<CheckStatusFilter, ''>; label: string }> = [
  { value: 'failed', label: 'Failed checks' },
  { value: 'passed', label: 'Passed checks' },
];

export const TEST_RUN_SORT_OPTIONS: Array<{ value: TestRunSortOption; label: string }> = [
  { value: 'risk_desc', label: 'Highest risk first' },
  { value: 'failures_desc', label: 'Most failed checks' },
  { value: 'health_desc', label: 'Best results first' },
  { value: 'health_asc', label: 'Weakest results first' },
  { value: 'recent_desc', label: 'Most recent first' },
  { value: 'endpoint_asc', label: 'Endpoint A-Z' },
];

export const INITIAL_TEST_RUN_FILTERS: TestRunFilterState = {
  method: '',
  endpointId: '',
  resultState: '',
  severity: '',
  category: '',
  ruleId: '',
  checkStatus: '',
  httpStatusFamily: '',
  httpStatus: '',
  testType: '',
  sortBy: 'risk_desc',
};

export function applyTestRunFilters(
  results: EndpointTestResult[],
  filters: TestRunFilterState,
  ignoredKeys: FilterKey[] = [],
): FilteredEndpointResult[] {
  const ignored = new Set<FilterKey>(ignoredKeys);
  const hasCheckFilters = CHECK_FILTER_KEYS.some((key) => !ignored.has(key) && Boolean(filters[key]));
  const hasHttpFilters = HTTP_FILTER_KEYS.some((key) => !ignored.has(key) && Boolean(filters[key]));

  const filteredResults = results
    .filter((result) => matchesEndpointLevelFilters(result, filters, ignored))
    .map((result) => {
      const visibleChecks = hasCheckFilters
        ? result.checks.filter((check) => matchesCheck(check, filters, ignored))
        : result.checks;
      const visibleHttpResults = hasHttpFilters
        ? result.httpResults.filter((httpResult) => matchesHttpResult(httpResult, filters, ignored))
        : result.httpResults;

      return buildFilteredEndpointResult(result, visibleChecks, visibleHttpResults);
    })
    .filter((result) => (!hasCheckFilters || result.checks.length > 0))
    .filter((result) => (!hasHttpFilters || result.httpResults.length > 0))
    .filter((result) => matchesResultState(result, filters, ignored));

  return filteredResults.sort((left, right) => compareFilteredResults(left, right, filters.sortBy));
}

export function getTestRunFilterOptions(
  results: EndpointTestResult[],
  filters: TestRunFilterState,
): TestRunFilterOptions {
  const methods = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['method']).map((result) => ({
      value: result.method,
      label: result.method,
    })),
    (left, right) => compareMethods(left.value, right.value),
  );

  const endpoints = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['endpointId']).map((result) => ({
      value: getEndpointValue(result),
      label: `${result.method} ${result.url}`,
    })),
    (left, right) => left.label.localeCompare(right.label),
  );

  const resultStateCandidates = applyTestRunFilters(results, filters, ['resultState']);
  const resultStates = RESULT_STATE_DEFINITIONS
    .map((definition) => ({
      value: definition.value,
      label: definition.label,
      count: resultStateCandidates.filter((result) => matchesResultStateValue(result, definition.value)).length,
    }))
    .filter((option) => option.count > 0)
    .map(formatOption);

  const severities = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['severity']).flatMap((result) =>
      result.checks.map((check) => ({
        value: check.severity,
        label: capitalize(check.severity),
      })),
    ),
    (left, right) => compareSeverity(left.value as Severity, right.value as Severity),
  );

  const categories = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['category']).flatMap((result) =>
      result.checks.map((check) => ({
        value: check.category,
        label: check.category,
      })),
    ),
    (left, right) => left.label.localeCompare(right.label),
  );

  const rules = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['ruleId']).flatMap((result) =>
      result.checks.map((check) => ({
        value: check.ruleId,
        label: check.ruleName,
      })),
    ),
    (left, right) => left.label.localeCompare(right.label),
  );

  const checkStatuses = CHECK_STATUS_DEFINITIONS
    .map((definition) => ({
      value: definition.value,
      label: definition.label,
      count: applyTestRunFilters(results, filters, ['checkStatus']).reduce((total, result) => (
        total + result.checks.filter((check) => isMatchingCheckStatus(check, definition.value)).length
      ), 0),
    }))
    .filter((option) => option.count > 0)
    .map(formatOption);

  const httpStatusFamilies = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['httpStatusFamily']).flatMap((result) =>
      result.httpResults.map((httpResult) => ({
        value: getHttpStatusFamily(httpResult.statusCode),
        label: getHttpStatusFamily(httpResult.statusCode),
      })),
    ),
    (left, right) => left.value.localeCompare(right.value),
  );

  const httpStatuses = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['httpStatus']).flatMap((result) =>
      result.httpResults.map((httpResult) => ({
        value: String(httpResult.statusCode),
        label: String(httpResult.statusCode),
      })),
    ),
    (left, right) => Number(left.value) - Number(right.value),
  );

  const testTypes = buildOptionsFromEntries(
    applyTestRunFilters(results, filters, ['testType']).flatMap((result) =>
      result.httpResults.map((httpResult) => ({
        value: getHttpTestTypeValue(httpResult),
        label: getHttpTestTypeLabel(httpResult),
      })),
    ),
    (left, right) => left.label.localeCompare(right.label),
  );

  return {
    methods,
    endpoints,
    resultStates,
    severities,
    categories,
    rules,
    checkStatuses,
    httpStatusFamilies,
    httpStatuses,
    testTypes,
    sortOptions: TEST_RUN_SORT_OPTIONS,
  };
}

export function summarizeFilteredTestRunResults(
  filteredResults: FilteredEndpointResult[],
  allResults: EndpointTestResult[],
): FilteredTestRunSummary {
  return {
    endpoints: filteredResults.length,
    totalEndpoints: allResults.length,
    visibleChecks: filteredResults.reduce((total, result) => total + result.checks.length, 0),
    totalChecks: allResults.reduce((total, result) => total + result.checks.length, 0),
    visibleHttpResults: filteredResults.reduce((total, result) => total + result.httpResults.length, 0),
    totalHttpResults: allResults.reduce((total, result) => total + result.httpResults.length, 0),
    failedChecks: filteredResults.reduce((total, result) => total + result.failedChecks, 0),
    criticalFindings: filteredResults.reduce((total, result) => total + result.criticalFindings, 0),
    highFindings: filteredResults.reduce((total, result) => total + result.highFindings, 0),
  };
}

export function sanitizeTestRunFilters(
  filters: TestRunFilterState,
  options: TestRunFilterOptions,
): TestRunFilterState {
  let nextFilters = filters;

  const availabilityMap: Record<Exclude<FilterKey, 'sortBy'>, TestRunFilterOption[]> = {
    method: options.methods,
    endpointId: options.endpoints,
    resultState: options.resultStates,
    severity: options.severities,
    category: options.categories,
    ruleId: options.rules,
    checkStatus: options.checkStatuses,
    httpStatusFamily: options.httpStatusFamilies,
    httpStatus: options.httpStatuses,
    testType: options.testTypes,
  };

  FILTER_VALUE_KEYS.forEach((key) => {
    const currentValue = nextFilters[key];
    if (!currentValue) {
      return;
    }

    const isAvailable = availabilityMap[key].some((option) => option.value === currentValue);
    if (!isAvailable) {
      nextFilters = { ...nextFilters, [key]: '' };
    }
  });

  return nextFilters;
}

export function hasActiveTestRunFilters(filters: TestRunFilterState): boolean {
  return FILTER_VALUE_KEYS.some((key) => Boolean(filters[key]));
}

function matchesEndpointLevelFilters(
  result: EndpointTestResult,
  filters: TestRunFilterState,
  ignored: Set<FilterKey>,
): boolean {
  if (!ignored.has('method') && filters.method && result.method !== filters.method) {
    return false;
  }

  if (!ignored.has('endpointId') && filters.endpointId && getEndpointValue(result) !== filters.endpointId) {
    return false;
  }

  return true;
}

function matchesCheck(
  check: SecurityCheck,
  filters: TestRunFilterState,
  ignored: Set<FilterKey>,
): boolean {
  if (!ignored.has('severity') && filters.severity && check.severity !== filters.severity) {
    return false;
  }

  if (!ignored.has('category') && filters.category && check.category !== filters.category) {
    return false;
  }

  if (!ignored.has('ruleId') && filters.ruleId && check.ruleId !== filters.ruleId) {
    return false;
  }

  if (!ignored.has('checkStatus') && filters.checkStatus && !isMatchingCheckStatus(check, filters.checkStatus)) {
    return false;
  }

  return true;
}

function matchesHttpResult(
  httpResult: HttpTestResult,
  filters: TestRunFilterState,
  ignored: Set<FilterKey>,
): boolean {
  if (!ignored.has('httpStatusFamily') && filters.httpStatusFamily) {
    if (getHttpStatusFamily(httpResult.statusCode) !== filters.httpStatusFamily) {
      return false;
    }
  }

  if (!ignored.has('httpStatus') && filters.httpStatus && String(httpResult.statusCode) !== filters.httpStatus) {
    return false;
  }

  if (!ignored.has('testType') && filters.testType && getHttpTestTypeValue(httpResult) !== filters.testType) {
    return false;
  }

  return true;
}

function matchesResultState(
  result: FilteredEndpointResult,
  filters: TestRunFilterState,
  ignored: Set<FilterKey>,
): boolean {
  if (ignored.has('resultState') || !filters.resultState) {
    return true;
  }

  return matchesResultStateValue(result, filters.resultState);
}

function matchesResultStateValue(
  result: Pick<FilteredEndpointResult, 'failedChecks' | 'criticalFindings' | 'highFindings' | 'httpResults'>,
  value: Exclude<ResultStateFilter, ''>,
): boolean {
  switch (value) {
    case 'clean':
      return result.failedChecks === 0;
    case 'with_findings':
      return result.failedChecks > 0;
    case 'critical_high':
      return result.criticalFindings > 0 || result.highFindings > 0;
    case 'http_errors':
      return result.httpResults.some((httpResult) => httpResult.statusCode >= 400 || Boolean(httpResult.error));
    default:
      return true;
  }
}

function buildFilteredEndpointResult(
  result: EndpointTestResult,
  checks: SecurityCheck[],
  httpResults: HttpTestResult[],
): FilteredEndpointResult {
  const failedChecks = checks.filter((check) => !check.passed);

  return {
    ...result,
    checks,
    httpResults,
    passedChecks: checks.filter((check) => check.passed).length,
    failedChecks: failedChecks.length,
    criticalFindings: failedChecks.filter((check) => check.severity === 'critical').length,
    highFindings: failedChecks.filter((check) => check.severity === 'high').length,
    mediumFindings: failedChecks.filter((check) => check.severity === 'medium').length,
    lowFindings: failedChecks.filter((check) => check.severity === 'low').length,
    totalCheckCount: result.checks.length,
    totalHttpResultCount: result.httpResults.length,
    visibleCheckCount: checks.length,
    visibleHttpResultCount: httpResults.length,
    hiddenCheckCount: Math.max(0, result.checks.length - checks.length),
    hiddenHttpResultCount: Math.max(0, result.httpResults.length - httpResults.length),
  };
}

function compareFilteredResults(
  left: FilteredEndpointResult,
  right: FilteredEndpointResult,
  sortBy: TestRunSortOption,
): number {
  switch (sortBy) {
    case 'failures_desc':
      return compareNumbersDesc(left.failedChecks, right.failedChecks)
        || compareNumbersDesc(getRiskWeight(left), getRiskWeight(right))
        || left.url.localeCompare(right.url);
    case 'health_desc':
      return compareNumbersDesc(getHealthScore(left), getHealthScore(right))
        || compareNumbersAsc(getRiskWeight(left), getRiskWeight(right))
        || left.url.localeCompare(right.url);
    case 'health_asc':
      return compareNumbersAsc(getHealthScore(left), getHealthScore(right))
        || compareNumbersDesc(getRiskWeight(left), getRiskWeight(right))
        || left.url.localeCompare(right.url);
    case 'recent_desc':
      return compareNumbersDesc(getTimestamp(left.testedAt), getTimestamp(right.testedAt))
        || left.url.localeCompare(right.url);
    case 'endpoint_asc':
      return left.url.localeCompare(right.url) || compareMethods(left.method, right.method);
    case 'risk_desc':
    default:
      return compareNumbersDesc(getRiskWeight(left), getRiskWeight(right))
        || compareNumbersDesc(left.failedChecks, right.failedChecks)
        || left.url.localeCompare(right.url);
  }
}

function buildOptionsFromEntries(
  entries: Array<{ value: string; label: string }>,
  sort: (left: { value: string; label: string }, right: { value: string; label: string }) => number,
): TestRunFilterOption[] {
  const grouped = new Map<string, { value: string; label: string; count: number }>();

  entries.forEach((entry) => {
    const current = grouped.get(entry.value);
    if (current) {
      current.count += 1;
      return;
    }

    grouped.set(entry.value, {
      value: entry.value,
      label: entry.label,
      count: 1,
    });
  });

  return Array.from(grouped.values())
    .sort(sort)
    .map(formatOption);
}

function formatOption(option: { value: string; label: string; count: number }): TestRunFilterOption {
  return {
    value: option.value,
    label: `${option.label} (${option.count})`,
    count: option.count,
  };
}

function getEndpointValue(result: Pick<EndpointTestResult, 'endpointId' | 'method' | 'url'>): string {
  return result.endpointId || `${result.method}:${result.url}`;
}

function getHttpStatusFamily(statusCode: number): string {
  return `${Math.floor(statusCode / 100)}xx`;
}

function getHttpTestTypeValue(httpResult: HttpTestResult): string {
  return httpResult.testType?.trim() || 'default';
}

function getHttpTestTypeLabel(httpResult: HttpTestResult): string {
  return httpResult.testType?.trim() || 'Default';
}

function getRiskWeight(
  result: Pick<FilteredEndpointResult, 'criticalFindings' | 'highFindings' | 'mediumFindings' | 'lowFindings' | 'failedChecks'>,
): number {
  return (result.criticalFindings * 1000)
    + (result.highFindings * 100)
    + (result.mediumFindings * 10)
    + (result.lowFindings * 5)
    + result.failedChecks;
}

function getHealthScore(result: Pick<FilteredEndpointResult, 'passedChecks' | 'failedChecks'>): number {
  const totalChecks = result.passedChecks + result.failedChecks;
  if (totalChecks === 0) {
    return 1;
  }

  return result.passedChecks / totalChecks;
}

function getTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareMethods(left: string, right: string): number {
  const leftIndex = METHOD_ORDER.indexOf(left);
  const rightIndex = METHOD_ORDER.indexOf(right);

  if (leftIndex === -1 || rightIndex === -1) {
    return left.localeCompare(right);
  }

  return leftIndex - rightIndex;
}

function compareSeverity(left: Severity, right: Severity): number {
  return SEVERITY_ORDER.indexOf(left) - SEVERITY_ORDER.indexOf(right);
}

function compareNumbersDesc(left: number, right: number): number {
  return right - left;
}

function compareNumbersAsc(left: number, right: number): number {
  return left - right;
}

function isMatchingCheckStatus(check: SecurityCheck, value: Exclude<CheckStatusFilter, ''>): boolean {
  return value === 'passed' ? check.passed : !check.passed;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
