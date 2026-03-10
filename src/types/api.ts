export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportFormat = 'json' | 'html' | 'pdf';

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

export interface StatusProgress {
  phase?: string;
  detail?: string;
  percentage?: number;
  endpointsTested?: number;
  endpointsTotal?: number;
  elapsedSeconds?: number;
}

export interface StatusResponse {
  status: AnalysisStatus;
  progress?: StatusProgress | string;
  summary?: string;
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
}
