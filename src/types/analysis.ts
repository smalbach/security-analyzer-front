import type { AnalysisStatus, HttpMethod } from './common';
import type { AiAnalysis, EndpointTestResult } from './test-runs';

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
