import type {
  AnalysisHistoryItem,
  AnalysisReport,
  PaginatedResponse,
  PreviewAndStartResponse,
  PreviewData,
  PreviewFileRequest,
  ReportFormat,
  StatusResponse,
} from '../types/api';

/**
 * Shape returned by the backend TransformInterceptor.
 * All non-@Res() endpoints are wrapped in this envelope.
 */
interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async previewFile(params: PreviewFileRequest): Promise<PreviewAndStartResponse> {
    const formData = new FormData();
    formData.append('file', params.file);

    if (params.baseUrl && params.baseUrl.trim()) {
      formData.append('baseUrl', params.baseUrl.trim());
    }
    if (params.projectName && params.projectName.trim()) {
      formData.append('projectName', params.projectName.trim());
    }
    if (typeof params.crossUserPermutations === 'boolean') {
      formData.append('crossUserPermutations', String(params.crossUserPermutations));
    }
    if (typeof params.testInjections === 'boolean') {
      formData.append('testInjections', String(params.testInjections));
    }
    if (typeof params.testRateLimit === 'boolean') {
      formData.append('testRateLimit', String(params.testRateLimit));
    }
    if (typeof params.requestTimeout === 'number' && Number.isFinite(params.requestTimeout)) {
      formData.append('requestTimeout', String(params.requestTimeout));
    }

    const response = await fetch(`${this.baseUrl}/analysis/preview-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    const raw = await response.json();

    // Unwrap TransformInterceptor envelope { success, data, timestamp }
    const payload = this.unwrap<
      PreviewAndStartResponse | (PreviewData & { analysisId?: string; message?: string; preview?: PreviewData })
    >(raw);

    // Backend returns { analysisId, message, preview: { ... } }
    if ('preview' in payload && payload.preview) {
      return payload as PreviewAndStartResponse;
    }

    return {
      analysisId: 'N/A',
      message: 'Preview received without analysisId.',
      preview: payload as PreviewData,
    };
  }

  async getStatus(analysisId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>(`/analysis/${analysisId}/status`);
  }

  async getResults(analysisId: string): Promise<AnalysisReport> {
    return this.request<AnalysisReport>(`/analysis/${analysisId}/results`);
  }

  async getHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    projectName?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<PaginatedResponse<AnalysisHistoryItem>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.projectName) query.set('projectName', params.projectName);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const qs = query.toString();
    return this.request<PaginatedResponse<AnalysisHistoryItem>>(
      `/analysis/history${qs ? `?${qs}` : ''}`,
    );
  }

  async downloadReport(analysisId: string, format: ReportFormat): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/analysis/${analysisId}/report/${format}`);

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    return response.blob();
  }

  // ─── Internal helpers ─────────────────────────────────────────────

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    const raw = await response.json();

    // Unwrap TransformInterceptor envelope
    return this.unwrap<T>(raw);
  }

  /**
   * Unwrap the `{ success, data, timestamp }` envelope added by the backend
   * TransformInterceptor. If the payload is not wrapped, return it as-is.
   */
  private unwrap<T>(raw: unknown): T {
    if (
      raw &&
      typeof raw === 'object' &&
      'success' in (raw as Record<string, unknown>) &&
      'data' in (raw as Record<string, unknown>)
    ) {
      return (raw as ApiEnvelope<T>).data;
    }
    return raw as T;
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as {
        message?: string | string[];
        error?: string;
        statusCode?: number;
      };

      // GlobalExceptionFilter format: { statusCode, error, correlationId, ... }
      // ValidationPipe format: { message: string | string[], error: string }
      const message = Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message || payload.error;

      if (message) {
        return `API ${response.status}: ${message}`;
      }
    } catch {
      // Ignore parse error and fallback to HTTP status text.
    }

    return `API ${response.status}: ${response.statusText || 'Request failed'}`;
  }
}
