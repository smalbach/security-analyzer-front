export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportFormat = 'json' | 'html' | 'pdf';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
