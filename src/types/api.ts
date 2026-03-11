export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportFormat = 'json' | 'html' | 'pdf';

// ─── Auth Config ─────────────────────────────────────────────────────────────

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api_key' | 'none';
  token?: string;
  username?: string;
  password?: string;
  header_name?: string;
  login_endpoint?: string;
  login_method?: string;
  login_body?: Record<string, unknown>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  baseUrl: string | null;
  authConfig: AuthConfig | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: AuthConfig;
  tags?: string[];
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;

// ─── Endpoints ────────────────────────────────────────────────────────────────

export interface PathParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'uuid';
  required: boolean;
  description?: string;
  example?: string;
}

export interface QueryParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  example?: string;
  enum?: string[];
}

export interface HeaderParam {
  name: string;
  value: string;
  required: boolean;
}

export interface BodySchema {
  content_type: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

export interface EndpointParameters {
  path?: PathParam[];
  query?: QueryParam[];
  headers?: HeaderParam[];
  body?: BodySchema;
}

export interface ApiEndpoint {
  id: string;
  projectId: string;
  method: string;
  path: string;
  description: string | null;
  parameters: EndpointParameters | null;
  requiresAuth: boolean;
  tags: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEndpointRequest {
  method: string;
  path: string;
  description?: string;
  parameters?: EndpointParameters;
  requiresAuth?: boolean;
  tags?: string[];
  orderIndex?: number;
}

export interface TestEndpointRequest {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  authToken?: string;
  baseUrl?: string;
  rules?: string[];
}

export interface TestEndpointResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  url: string;
  method: string;
}

export interface ImportResult {
  imported: number;
  format: string;
  endpoints: ApiEndpoint[];
}

// ─── Test Runs ────────────────────────────────────────────────────────────────

export interface RuleSelection {
  bola_idor?: boolean;
  bfla?: boolean;
  auth_jwt?: boolean;
  jwt_attack?: boolean;
  cors?: boolean;
  injection?: boolean;
  mass_assignment?: boolean;
  data_exposure?: boolean;
  error_disclosure?: boolean;
  verbose_error?: boolean;
  rate_limit?: boolean;
  security_headers?: boolean;
  method_tampering?: boolean;
  content_type?: boolean;
  cross_user_access?: boolean;
  endpoint_consistency?: boolean;
  response_size_anomaly?: boolean;
}

export interface TestCredential {
  username: string;
  password: string;
  role?: string;
  loginEndpoint?: string;
  loginMethod?: string;
  loginBodyTemplate?: Record<string, unknown>;
}

export interface StartTestRunRequest {
  label?: string;
  credentials: TestCredential[];
  rules?: RuleSelection;
  testRateLimit?: boolean;
  rateLimitIterations?: number;
  requestTimeout?: number;
  crossUserPermutations?: boolean;
  generatePdf?: boolean;
}

export interface TestRunSummary {
  securityScore?: number;
  globalRiskLevel?: string;
  totalEndpoints: number;
  totalChecks: number;
  totalPassed: number;
  totalFailed: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface TestRun {
  id: string;
  projectId: string;
  userId: string;
  label: string | null;
  status: AnalysisStatus;
  options?: Record<string, unknown>;
  summary?: TestRunSummary;
  endpointResults?: EndpointTestResult[];
  aiAnalysis?: AiAnalysis;
  unprotectedEndpoints?: unknown[];
  error?: string | null;
  progress?: StatusProgress;
  visibility: 'private' | 'public';
  shareToken?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Analysis / Test Results ──────────────────────────────────────────────────

export interface StatusProgress {
  phase?: string;
  detail?: string;
  percentage?: number;
  endpointsTested?: number;
  endpointsTotal?: number;
  elapsedSeconds?: number;
  currentStep?: number;
  totalSteps?: number;
  stepLabel?: string;
  steps?: StatusStep[];
}

export interface StatusStep {
  step: number;
  label: string;
  status: string;
}

export interface StatusResponse {
  status: AnalysisStatus;
  progress?: StatusProgress | string;
  summary?: string | TestRunSummary;
  error?: string | null;
}

export interface SecurityCheck {
  ruleId: string;
  ruleName: string;
  category: string;
  passed: boolean;
  severity: Severity;
  description: string;
  finding: string;
  remediation: string;
  reproduceSteps: string[];
  references: string[];
  evidence?: string;
}

export interface HttpTestResult {
  endpoint: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: Record<string, unknown> | null;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  responseTime: number;
  error?: string;
  testType?: string;
}

export interface EndpointTestResult {
  endpointId: string;
  url: string;
  method: string;
  testedAt: string;
  httpResults: HttpTestResult[];
  checks: SecurityCheck[];
  passedChecks: number;
  failedChecks: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
}

export interface AiAnalysis {
  globalRiskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  securityScore: number;
  scoreJustification: string;
  top5Vulnerabilities: {
    rank: number;
    title: string;
    description: string;
    affectedEndpoints: string[];
    priority: string;
  }[];
  remediationRoadmap: {
    phase: number;
    title: string;
    timeframe: string;
    actions: string[];
  }[];
  executiveSummary: string;
  technicalSummary: string;
}

export interface AnalysisHistoryItem {
  id: string;
  projectName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalEndpoints: number;
  totalChecks: number;
  totalPassed: number;
  totalFailed: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  securityScore: number;
  riskLevel: string | null;
  userId: string | null;
  visibility: 'private' | 'public';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AnalysisReport {
  id: string;
  projectName: string;
  status: AnalysisStatus;
  startedAt: string;
  completedAt?: string;
  totalEndpoints: number;
  totalChecks: number;
  totalPassed: number;
  totalFailed: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  endpointResults: EndpointTestResult[];
  aiAnalysis?: AiAnalysis;
  userId?: string;
  visibility?: 'private' | 'public';
  shareToken?: string;
}

// ─── Legacy (kept for backward compat) ────────────────────────────────────────

export interface PreviewCredential {
  username: string;
  role?: string;
  hasLoginEndpoint: boolean;
}

export interface PreviewEndpoint {
  endpointId: string;
  method: HttpMethod;
  url: string;
  requiresAuth: boolean;
  hasBody: boolean;
}

export interface PreviewData {
  baseUrl: string;
  totalEndpoints: number;
  totalUsers: number;
  sections: string[];
  endpoints: PreviewEndpoint[];
  credentials: PreviewCredential[];
}

export interface PreviewFileRequest {
  file: File;
  baseUrl?: string;
  projectName?: string;
  crossUserPermutations?: boolean;
  testInjections?: boolean;
  testRateLimit?: boolean;
  requestTimeout?: number;
}

export interface PreviewAndStartResponse {
  analysisId: string;
  message: string;
  preview: PreviewData;
}
