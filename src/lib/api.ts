import type {
  AnalysisHistoryItem,
  AnalysisReport,
  ApiEndpoint,
  AuthResponse,
  AuthUser,
  CreateEndpointRequest,
  CreateProjectRequest,
  ImportResult,
  PaginatedResponse,
  PreviewAndStartResponse,
  PreviewData,
  PreviewFileRequest,
  Project,
  ReportFormat,
  StartTestRunRequest,
  StatusResponse,
  TestEndpointRequest,
  TestEndpointResponse,
  TestRun,
  UpdateProjectRequest,
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

export class ApiUnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'ApiUnauthorizedError';
  }
}

export function isUnauthorizedError(error: unknown): error is ApiUnauthorizedError {
  return error instanceof ApiUnauthorizedError;
}

export class ApiClient {
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  clone(baseUrl: string): ApiClient {
    const client = new ApiClient(baseUrl);
    client.accessToken = this.accessToken;
    client.unauthorizedHandler = this.unauthorizedHandler;
    return client;
  }

  // ─── Auth methods ───────────────────────────────────────────────

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.requestWithAuth<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.requestWithAuth<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.requestWithAuth<void>('/auth/logout', { method: 'POST' });
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    const raw = await response.json();
    return this.unwrap<{ accessToken: string }>(raw);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.requestWithAuth<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.requestWithAuth<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async getProfile(): Promise<AuthUser> {
    return this.request<AuthUser>('/auth/me');
  }

  async updateVisibility(
    analysisId: string,
    visibility: 'private' | 'public',
  ): Promise<{ visibility: string; shareToken: string | null; shareUrl: string | null }> {
    return this.requestProtectedWithAuth<{ visibility: string; shareToken: string | null; shareUrl: string | null }>(
      `/analysis/${analysisId}/visibility`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      },
    );
  }

  // ─── Projects ─────────────────────────────────────────────────

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.requestProtectedWithAuth<Project>('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getProjects(_params?: { page?: number; limit?: number }): Promise<{ data: Project[] }> {
    const result = await this.requestProtected<Project[] | { data: Project[] }>('/projects');
    // Backend returns plain array; normalize to { data } shape for callers
    return Array.isArray(result) ? { data: result } : result;
  }

  async getProject(id: string): Promise<Project> {
    return this.requestProtected<Project>(`/projects/${id}`);
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return this.requestProtectedWithAuth<Project>(`/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.requestProtectedWithAuth<void>(`/projects/${id}`, { method: 'DELETE' });
  }

  // ─── Endpoints ────────────────────────────────────────────────

  async createEndpoint(projectId: string, data: CreateEndpointRequest): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getEndpoints(projectId: string): Promise<ApiEndpoint[]> {
    const result = await this.requestProtected<ApiEndpoint[] | { data: ApiEndpoint[] }>(
      `/projects/${projectId}/endpoints`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async getEndpoint(projectId: string, endpointId: string): Promise<ApiEndpoint> {
    return this.requestProtected<ApiEndpoint>(`/projects/${projectId}/endpoints/${endpointId}`);
  }

  async updateEndpoint(projectId: string, endpointId: string, data: Partial<CreateEndpointRequest>): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints/${endpointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteEndpoint(projectId: string, endpointId: string): Promise<void> {
    return this.requestProtectedWithAuth<void>(
      `/projects/${projectId}/endpoints/${endpointId}`,
      { method: 'DELETE' },
    );
  }

  async importEndpointsFromFile(projectId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    let response = await fetch(`${this.baseUrl}/projects/${projectId}/endpoints/import/file`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(
        `${this.baseUrl}/projects/${projectId}/endpoints/import/file`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers,
        },
      );
      if (retryResponse) {
        response = retryResponse;
      }
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
    }
    const raw = await response.json();
    return this.unwrap<ImportResult>(raw);
  }

  async importEndpointsFromCurl(projectId: string, curl: string): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints/import/curl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curl }),
    });
  }

  async testEndpoint(projectId: string, endpointId: string, data: TestEndpointRequest): Promise<TestEndpointResponse> {
    return this.requestProtectedWithAuth<TestEndpointResponse>(`/projects/${projectId}/endpoints/${endpointId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // ─── Test Runs ────────────────────────────────────────────────

  async startTestRun(projectId: string, data: StartTestRunRequest): Promise<TestRun> {
    const response = await this.fetchProtectedWithAuth(`/projects/${projectId}/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const locationHeader = response.headers.get('location') ?? response.headers.get('Location');
    const text = await response.text();
    const result = text
      ? this.unwrap<TestRun | { id?: string; runId?: string; testRunId?: string }>(JSON.parse(text))
      : undefined;

    if (
      result &&
      typeof result === 'object' &&
      'id' in result &&
      typeof result.id === 'string' &&
      ('status' in result || 'projectId' in result)
    ) {
      return result as TestRun;
    }

    const record = result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
    const identifier =
      (typeof record?.runId === 'string' && record.runId) ||
      (typeof record?.testRunId === 'string' && record.testRunId) ||
      (typeof record?.id === 'string' && record.id) ||
      this.extractRunIdFromLocation(locationHeader) ||
      undefined;

    if (typeof identifier === 'string' && identifier.length > 0) {
      return this.getTestRun(projectId, identifier);
    }

    throw new Error('API did not return a valid test run identifier.');
  }

  async getTestRuns(projectId: string, _params?: { page?: number; limit?: number }): Promise<{ data: TestRun[] }> {
    const result = await this.requestProtected<TestRun[] | { data: TestRun[] }>(
      `/projects/${projectId}/test-runs`,
    );
    return Array.isArray(result) ? { data: result } : result;
  }

  async getTestRun(projectId: string, runId: string): Promise<TestRun> {
    return this.requestProtected<TestRun>(`/projects/${projectId}/test-runs/${runId}`);
  }

  async getTestRunStatus(projectId: string, runId: string): Promise<StatusResponse> {
    return this.requestProtected<StatusResponse>(`/projects/${projectId}/test-runs/${runId}/status`);
  }

  async downloadTestRunReport(projectId: string, runId: string, format: ReportFormat): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    return this.requestProtectedBlob(`/projects/${projectId}/test-runs/${runId}/report/${format}`);
  }

  async updateTestRunVisibility(
    projectId: string,
    runId: string,
    visibility: 'private' | 'public',
  ): Promise<{ visibility: string; shareToken: string | null; shareUrl: string | null }> {
    return this.requestProtectedWithAuth<{ visibility: string; shareToken: string | null; shareUrl: string | null }>(
      `/projects/${projectId}/test-runs/${runId}/visibility`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      },
    );
  }

  // ─── Existing methods ──────────────────────────────────────────

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

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}/analysis/preview-file`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(`${this.baseUrl}/analysis/preview-file`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      if (retryResponse) {
        response = retryResponse;
      }
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
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

  async getStatus(analysisId: string, shareToken?: string | null): Promise<StatusResponse> {
    const qs = shareToken ? `?token=${encodeURIComponent(shareToken)}` : '';
    return shareToken
      ? this.request<StatusResponse>(`/analysis/${analysisId}/status${qs}`)
      : this.requestProtected<StatusResponse>(`/analysis/${analysisId}/status${qs}`);
  }

  async getResults(analysisId: string, shareToken?: string | null): Promise<AnalysisReport> {
    const qs = shareToken ? `?token=${encodeURIComponent(shareToken)}` : '';
    return shareToken
      ? this.request<AnalysisReport>(`/analysis/${analysisId}/results${qs}`)
      : this.requestProtected<AnalysisReport>(`/analysis/${analysisId}/results${qs}`);
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
    return this.requestProtected<PaginatedResponse<AnalysisHistoryItem>>(
      `/analysis/history${qs ? `?${qs}` : ''}`,
    );
  }

  async downloadReport(analysisId: string, format: ReportFormat): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return this.requestProtectedBlob(`/analysis/${analysisId}/report/${format}`);
  }

  // ─── Internal helpers ─────────────────────────────────────────────

  private async request<T>(
    path: string,
    options: { retryOnUnauthorized?: boolean; handleUnauthorized?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && options.retryOnUnauthorized && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(`${this.baseUrl}${path}`, {
        credentials: 'include',
        headers,
      });
      if (retryResponse) {
        response = retryResponse;
      }
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401 && options.handleUnauthorized) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
    }

    const raw = await response.json();

    // Unwrap TransformInterceptor envelope
    return this.unwrap<T>(raw);
  }

  private async requestWithAuth<T>(
    path: string,
    init: RequestInit = {},
    options: { retryOnUnauthorized?: boolean; handleUnauthorized?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });

    // If 401, try refreshing the token once and retry
    if (response.status === 401 && options.retryOnUnauthorized && this.accessToken) {
      try {
        const refreshResult = await this.refreshToken();
        this.accessToken = refreshResult.accessToken;
        headers['Authorization'] = `Bearer ${this.accessToken}`;

        const retryResponse = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          credentials: 'include',
          headers,
        });

        if (!retryResponse.ok) {
          throw new Error(await this.extractErrorMessage(retryResponse));
        }

        const raw = await retryResponse.json();
        return this.unwrap<T>(raw);
      } catch {
        // Refresh also failed – throw original 401
        throw new Error(await this.extractErrorMessage(response));
      }
    }

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response));
    }

    // Handle void responses (e.g. logout)
    const text = await response.text();
    if (!text) return undefined as T;

    const raw = JSON.parse(text);
    return this.unwrap<T>(raw);
  }

  private async requestProtected<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      retryOnUnauthorized: true,
      handleUnauthorized: true,
    });
  }

  private async requestProtectedWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchProtectedWithAuth(path, init);
    const text = await response.text();
    if (!text) return undefined as T;

    const raw = JSON.parse(text);
    return this.unwrap<T>(raw);
  }

  private async fetchProtectedWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(`${this.baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers,
      });
      if (retryResponse) {
        response = retryResponse;
      }
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
    }

    return response;
  }

  private async requestProtectedBlob(path: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(`${this.baseUrl}${path}`, {
        credentials: 'include',
        headers,
      });
      if (retryResponse) {
        response = retryResponse;
      }
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
    }

    return response.blob();
  }

  private async retryAfterRefresh(url: string, init: RequestInit): Promise<Response | null> {
    try {
      const refreshResult = await this.refreshToken();
      this.accessToken = refreshResult.accessToken;

      const retryHeaders: Record<string, string> = {
        ...((init.headers as Record<string, string> | undefined) ?? {}),
        Authorization: `Bearer ${this.accessToken}`,
      };

      return await fetch(url, {
        ...init,
        credentials: 'include',
        headers: retryHeaders,
      });
    } catch {
      return null;
    }
  }

  private handleUnauthorized(): void {
    this.unauthorizedHandler?.();
  }

  private extractRunIdFromLocation(locationHeader?: string | null): string | undefined {
    if (!locationHeader) {
      return undefined;
    }

    const normalizedLocation = locationHeader.replace(/\/$/, '');
    const segments = normalizedLocation.split('/');
    const lastSegment = segments[segments.length - 1];
    return lastSegment || undefined;
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
