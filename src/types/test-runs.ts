import type { AnalysisStatus, Severity } from './common';

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
  roleId?: string;
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
  endpointIds?: string[];
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

export interface FindingGroup {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: string;
  affectedEndpointsCount: number;
  affectedEndpoints: { method: string; url: string }[];
  finding: string;
  remediation: string;
  proposedSolution: string;
  commonFix: string;
  codeExample?: string;
  references: string[];
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
  findingGroups?: FindingGroup[];
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

export interface PaginatedTestRunResults extends TestRun {
  endpointResultsTotal: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
