import type {
  AnalysisReport,
  PreviewAndStartResponse,
  PreviewData,
  PreviewFileRequest,
  ReportFormat,
  StatusResponse,
} from '../types/api';

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

    const payload = (await response.json()) as
      | PreviewAndStartResponse
      | (PreviewData & { analysisId?: string; message?: string; preview?: PreviewData });

    // Backward compatibility if backend returns preview object directly.
    if ('preview' in payload && payload.preview) {
      return payload as PreviewAndStartResponse;
    }

    return {
      analysisId: 'N/A',
      message: 'Preview recibido sin analysisId.',
      preview: payload as PreviewData,
    };
  }

  async getStatus(analysisId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>(`/analysis/${analysisId}/status`);
  }

  async getResults(analysisId: string): Promise<AnalysisReport> {
    return this.request<AnalysisReport>(`/analysis/${analysisId}/results`);
  }

  async downloadReport(analysisId: string, format: ReportFormat): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/analysis/${analysisId}/report/${format}`);

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    return response.blob();
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    return (await response.json()) as T;
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { message?: string | string[]; error?: string };
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
