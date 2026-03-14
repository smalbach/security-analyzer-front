// ─── Load Profile ──────────────────────────────────────────────────────────
export type LoadStrategy = 'constant' | 'ramp' | 'spike';

export interface LoadProfile {
  strategy: LoadStrategy;
  virtualUsers: number;
  rampUpSeconds?: number;
  durationSeconds: number;
  iterationsLimit?: number;
}

// ─── Scenario ──────────────────────────────────────────────────────────────
export interface PerfExtractor {
  name: string;
  jsonPath: string;
}

export interface PerfStepAssertion {
  type: 'statusCode' | 'responseTime';
  operator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte';
  value: number;
}

export interface PerfScenarioStep {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  extractors?: PerfExtractor[];
  assertions?: PerfStepAssertion[];
  thinkTimeMs?: number;
}

export interface PerfScenario {
  id: string;
  name: string;
  steps: PerfScenarioStep[];
  weight?: number;
}

// ─── Threshold ─────────────────────────────────────────────────────────────
export type ThresholdMetric = 'p50' | 'p75' | 'p90' | 'p95' | 'p99' | 'errorRate' | 'rps' | 'avgResponseTime';
export type ThresholdOperator = 'lt' | 'gt' | 'lte' | 'gte';

export interface PerfThreshold {
  metric: ThresholdMetric;
  operator: ThresholdOperator;
  value: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

// ─── Plan ──────────────────────────────────────────────────────────────────
export interface PerfTestPlan {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  scenarios: PerfScenario[];
  loadProfile: LoadProfile;
  thresholds: PerfThreshold[];
  executionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerfPlanRequest {
  name: string;
  description?: string;
  scenarios: PerfScenario[];
  loadProfile: LoadProfile;
  thresholds?: PerfThreshold[];
}

export type UpdatePerfPlanRequest = Partial<CreatePerfPlanRequest>;

// ─── Execution ─────────────────────────────────────────────────────────────
export interface PerfExecutionProgress {
  phase: string;
  percentage: number;
  message?: string;
  activeVUs?: number;
  elapsedSeconds?: number;
}

export interface PerfExecutionOptions {
  planName: string;
  scenarios: PerfScenario[];
  loadProfile: LoadProfile;
  thresholds: PerfThreshold[];
}

export interface PerfExecution {
  id: string;
  planId: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  options: PerfExecutionOptions | null;
  progress: PerfExecutionProgress | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  summary?: PerfRunSummary | null;
}

// ─── Metric Window ──────────────────────────────────────────────────────────
export interface EndpointWindowBreakdown {
  endpointId: string;
  path: string;
  method: string;
  requests: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
}

export interface PerfMetricWindow {
  id: string;
  executionId: string;
  windowStart: string;
  windowEnd: string;
  rps: number;
  errorRate: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  avgResponseTime: number;
  activeVUs: number;
  totalRequests: number;
  totalErrors: number;
  endpointBreakdown: EndpointWindowBreakdown[] | null;
}

// ─── Run Summary ────────────────────────────────────────────────────────────
export interface ThresholdResult {
  metric: string;
  operator: string;
  threshold: number;
  actual: number;
  passed: boolean;
  severity?: string;
}

export interface PerfRunSummary {
  id: string;
  executionId: string;
  planId: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  peakRps: number;
  avgRps: number;
  avgResponseTime: number;
  durationSeconds: number;
  thresholdResults: ThresholdResult[];
  passed: boolean;
  createdAt: string;
}

// ─── Comparison ─────────────────────────────────────────────────────────────
export interface ComparisonMetric {
  metric: string;
  baseline: number;
  candidate: number;
  delta: number;
  deltaPercent: number;
  improved: boolean;
}

export interface PerfComparisonReport {
  label?: string;
  baseline: { executionId: string; planName: string; startedAt: string | null };
  candidate: { executionId: string; planName: string; startedAt: string | null };
  metrics: ComparisonMetric[];
  verdict: 'improved' | 'degraded' | 'neutral';
}

export interface CreatePerfComparisonRequest {
  baselineExecutionId: string;
  candidateExecutionId: string;
  label?: string;
}

// ─── WebSocket events ───────────────────────────────────────────────────────
export interface PerfProgressEvent {
  executionId: string;
  phase: string;
  percentage: number;
  message?: string;
  activeVUs?: number;
}

export interface PerfMetricWindowEvent {
  executionId: string;
  window: PerfMetricWindow;
}

export interface PerfCompletedEvent {
  executionId: string;
  status: 'completed';
  summary: PerfRunSummary;
}

export interface PerfFailedEvent {
  executionId: string;
  status: 'failed';
  error: string;
}
