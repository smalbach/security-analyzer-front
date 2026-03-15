import type { DashboardStats } from '../types/dashboard';
import type {
  AnalysisHistoryItem,
  AnalysisReport,
  ApiEndpoint,
  CreateEndpointRequest,
  CreateProjectRequest,
  CrossRoleDataRule,
  CrossRoleRuleItem,
  EndpointRoleAccess,
  ImportResult,
  PaginatedEndpointsResponse,
  PaginatedResponse,
  PaginatedTestRunResults,
  PreviewAndStartResponse,
  PreviewData,
  PreviewFileRequest,
  ProjectRole,
  ReportFormat,
  RoleEndpointPermission,
  RoleEndpointPermissionItem,
  StartTestRunRequest,
  StatusResponse,
  TestEndpointRequest,
  TestEndpointResponse,
  TestRun,
  UpdateProjectRequest,
  CreateProjectRoleRequest,
  UpdateProjectRoleRequest,
  PerfTestPlan,
  CreatePerfPlanRequest,
  UpdatePerfPlanRequest,
  PerfExecution,
  PerfMetricWindow,
  PerfRunSummary,
  PerfComparisonReport,
  CreatePerfComparisonRequest,
  ProjectEnvironment,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '../types/api';
import type {
  FlowDefinition,
  FlowExecution,
  FlowDataset,
  FlowExecutionBatch,
  CreateFlowRequest,
  UpdateFlowRequest,
  SaveCanvasRequest,
  ExecuteFlowRequest,
  ExecuteFlowBatchRequest,
  CreateDatasetRequest,
} from '../types/flow';
import {
  forgotPassword as forgotPasswordRequest,
  getProfile as getProfileRequest,
  login as loginRequest,
  logout as logoutRequest,
  refreshToken as refreshTokenRequest,
  register as registerRequest,
  resetPassword as resetPasswordRequest,
} from '../services/api/authApi';
import {
  archiveProject as archiveProjectRequest,
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject as getProjectRequest,
  getProjects as getProjectsRequest,
  unarchiveProject as unarchiveProjectRequest,
  updateProject as updateProjectRequest,
} from '../services/api/projectsApi';
import { ApiUnauthorizedError, isUnauthorizedError } from '../services/http/errors';
import {
  extractErrorMessage,
  extractRunIdFromLocation,
  unwrapEnvelope,
} from '../services/http/helpers';
import {
  fetchProtectedWithAuth as fetchProtectedWithAuthRequest,
  request as requestPublic,
  requestProtected as requestProtectedResource,
  requestProtectedBlob as requestProtectedBlobResource,
  requestProtectedWithAuth as requestProtectedWithAuthResource,
  retryAfterRefresh as retryAfterRefreshRequest,
} from '../services/http/requests';
import type { ApiRequestContext, ApiRequestOptions } from '../services/http/types';

export { ApiUnauthorizedError, isUnauthorizedError };

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

  private getRequestContext(): ApiRequestContext {
    return {
      baseUrl: this.baseUrl,
      getAccessToken: () => this.accessToken,
      setAccessToken: (token) => {
        this.accessToken = token;
      },
      refreshToken: () => this.refreshToken(),
      handleUnauthorized: () => this.handleUnauthorized(),
    };
  }

  clone(baseUrl: string): ApiClient {
    const client = new ApiClient(baseUrl);
    client.accessToken = this.accessToken;
    client.unauthorizedHandler = this.unauthorizedHandler;
    return client;
  }

  async login(email: string, password: string) {
    return loginRequest(this.getRequestContext(), email, password);
  }

  async register(name: string, email: string, password: string) {
    return registerRequest(this.getRequestContext(), name, email, password);
  }

  async logout(): Promise<void> {
    await logoutRequest(this.getRequestContext());
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    return refreshTokenRequest(this.getRequestContext());
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return forgotPasswordRequest(this.getRequestContext(), email);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return resetPasswordRequest(this.getRequestContext(), token, newPassword);
  }

  async getProfile() {
    return getProfileRequest(this.getRequestContext());
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.requestProtected<DashboardStats>('/dashboard/stats');
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

  async createProject(data: CreateProjectRequest) {
    return createProjectRequest(this.getRequestContext(), data);
  }

  async getProjects(params?: { page?: number; limit?: number; archived?: boolean }) {
    return getProjectsRequest(this.getRequestContext(), params);
  }

  async getProject(id: string) {
    return getProjectRequest(this.getRequestContext(), id);
  }

  async updateProject(id: string, data: UpdateProjectRequest) {
    return updateProjectRequest(this.getRequestContext(), id, data);
  }

  async archiveProject(id: string) {
    return archiveProjectRequest(this.getRequestContext(), id);
  }

  async unarchiveProject(id: string) {
    return unarchiveProjectRequest(this.getRequestContext(), id);
  }

  async deleteProject(id: string): Promise<void> {
    return deleteProjectRequest(this.getRequestContext(), id);
  }

  async createEndpoint(projectId: string, data: CreateEndpointRequest): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getEndpoints(projectId: string): Promise<ApiEndpoint[]>;
  async getEndpoints(
    projectId: string,
    params: { page?: number; limit?: number; search?: string; all?: boolean },
  ): Promise<PaginatedEndpointsResponse>;
  async getEndpoints(
    projectId: string,
    params?: { page?: number; limit?: number; search?: string; all?: boolean },
  ): Promise<ApiEndpoint[] | PaginatedEndpointsResponse> {
    if (!params) {
      const result = await this.requestProtected<ApiEndpoint[] | { data: ApiEndpoint[] }>(
        `/projects/${projectId}/endpoints`,
      );
      return Array.isArray(result) ? result : result.data;
    }

    const query = new URLSearchParams();
    if (params.all) {
      query.set('limit', '500');
    } else {
      if (params.page !== undefined) query.set('page', String(params.page));
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
    }

    const qs = query.toString();
    return this.requestProtected<PaginatedEndpointsResponse>(
      `/projects/${projectId}/endpoints${qs ? `?${qs}` : ''}`,
    );
  }

  async getEndpointRoleAccess(projectId: string, endpointId: string): Promise<EndpointRoleAccess[]> {
    const result = await this.requestProtected<EndpointRoleAccess[] | { data: EndpointRoleAccess[] }>(
      `/projects/${projectId}/endpoints/${endpointId}/role-access`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async updateEndpointRoleAccess(
    projectId: string,
    endpointId: string,
    items: Pick<EndpointRoleAccess, 'roleId' | 'hasAccess' | 'dataScope'>[],
  ): Promise<EndpointRoleAccess[]> {
    const result = await this.requestProtectedWithAuth<EndpointRoleAccess[] | { data: EndpointRoleAccess[] }>(
      `/projects/${projectId}/endpoints/${endpointId}/role-access`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: items }),
      },
    );
    return Array.isArray(result) ? result : result.data;
  }

  async getEndpoint(projectId: string, endpointId: string): Promise<ApiEndpoint> {
    return this.requestProtected<ApiEndpoint>(`/projects/${projectId}/endpoints/${endpointId}`);
  }

  async updateEndpoint(
    projectId: string,
    endpointId: string,
    data: Partial<CreateEndpointRequest>,
  ): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints/${endpointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteEndpoint(projectId: string, endpointId: string): Promise<void> {
    return this.requestProtectedWithAuth<void>(`/projects/${projectId}/endpoints/${endpointId}`, {
      method: 'DELETE',
    });
  }

  async importEndpointsFromFile(projectId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

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

    return this.unwrap<ImportResult>(await response.json());
  }

  async importEndpointsFromCurl(projectId: string, curl: string): Promise<ApiEndpoint> {
    return this.requestProtectedWithAuth<ApiEndpoint>(`/projects/${projectId}/endpoints/import/curl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curl }),
    });
  }

  async testEndpoint(
    projectId: string,
    endpointId: string,
    data: TestEndpointRequest,
  ): Promise<TestEndpointResponse> {
    return this.requestProtectedWithAuth<TestEndpointResponse>(
      `/projects/${projectId}/endpoints/${endpointId}/test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
  }

  async testEndpointMultipart(
    projectId: string,
    endpointId: string,
    data: {
      pathParams?: Record<string, string>;
      queryParams?: Record<string, string>;
      headers?: Record<string, string>;
      formFields?: Array<{ key: string; value: string }>;
      files?: Array<{ fieldName: string; file: File }>;
      authToken?: string;
      baseUrl?: string;
      environmentId?: string;
    },
  ): Promise<TestEndpointResponse> {
    const formData = new FormData();

    if (data.pathParams) formData.append('pathParams', JSON.stringify(data.pathParams));
    if (data.queryParams) formData.append('queryParams', JSON.stringify(data.queryParams));
    if (data.headers) formData.append('headers', JSON.stringify(data.headers));
    if (data.formFields) formData.append('formFields', JSON.stringify(data.formFields));
    if (data.authToken) formData.append('authToken', data.authToken);
    if (data.baseUrl) formData.append('baseUrl', data.baseUrl);
    if (data.environmentId) formData.append('environmentId', data.environmentId);

    const fileFieldNames: string[] = [];
    if (data.files) {
      for (const { fieldName, file } of data.files) {
        formData.append('files', file);
        fileFieldNames.push(fieldName);
      }
    }
    formData.append('fileFieldNames', JSON.stringify(fileFieldNames));

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(
      `${this.baseUrl}/projects/${projectId}/endpoints/${endpointId}/test-multipart`,
      { method: 'POST', body: formData, credentials: 'include', headers },
    );

    if (response.status === 401 && this.accessToken) {
      const retryResponse = await this.retryAfterRefresh(
        `${this.baseUrl}/projects/${projectId}/endpoints/${endpointId}/test-multipart`,
        { method: 'POST', body: formData, credentials: 'include', headers },
      );
      if (retryResponse) response = retryResponse;
    }

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiUnauthorizedError(message);
      }
      throw new Error(message);
    }

    return this.unwrap<TestEndpointResponse>(await response.json());
  }

  // ─── Environments ──────────────────────────────────────────────────────

  async getEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
    const result = await this.requestProtected<ProjectEnvironment[] | { data: ProjectEnvironment[] }>(
      `/projects/${projectId}/environments`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async createEnvironment(projectId: string, data: CreateEnvironmentRequest): Promise<ProjectEnvironment> {
    return this.requestProtectedWithAuth<ProjectEnvironment>(`/projects/${projectId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getActiveEnvironment(projectId: string): Promise<ProjectEnvironment | null> {
    try {
      return await this.requestProtected<ProjectEnvironment>(`/projects/${projectId}/environments/active`);
    } catch {
      return null;
    }
  }

  async getEnvironment(projectId: string, envId: string, reveal = false): Promise<ProjectEnvironment> {
    const qs = reveal ? '?reveal=true' : '';
    return this.requestProtected<ProjectEnvironment>(
      `/projects/${projectId}/environments/${envId}${qs}`,
    );
  }

  async updateEnvironment(projectId: string, envId: string, data: UpdateEnvironmentRequest): Promise<ProjectEnvironment> {
    return this.requestProtectedWithAuth<ProjectEnvironment>(
      `/projects/${projectId}/environments/${envId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
  }

  async deleteEnvironment(projectId: string, envId: string): Promise<void> {
    return this.requestProtectedWithAuth<void>(
      `/projects/${projectId}/environments/${envId}`,
      { method: 'DELETE' },
    );
  }

  async activateEnvironment(projectId: string, envId: string): Promise<ProjectEnvironment> {
    return this.requestProtectedWithAuth<ProjectEnvironment>(
      `/projects/${projectId}/environments/${envId}/activate`,
      { method: 'PATCH' },
    );
  }

  async updateVariableValues(projectId: string, envId: string, updates: Record<string, string>): Promise<void> {
    return this.requestProtectedWithAuth<void>(
      `/projects/${projectId}/environments/${envId}/variables`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
    );
  }

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
      this.extractRunIdFromLocation(locationHeader);

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

  async getTestRunResults(
    projectId: string,
    runId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedTestRunResults> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();

    return this.requestProtected<PaginatedTestRunResults>(
      `/projects/${projectId}/test-runs/${runId}${qs ? `?${qs}` : ''}`,
    );
  }

  async getTestRunStatus(projectId: string, runId: string): Promise<StatusResponse> {
    return this.requestProtected<StatusResponse>(`/projects/${projectId}/test-runs/${runId}/status`);
  }

  async downloadTestRunReport(projectId: string, runId: string, format: ReportFormat): Promise<Blob> {
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

  async getRoles(projectId: string): Promise<ProjectRole[]> {
    const result = await this.requestProtected<ProjectRole[] | { data: ProjectRole[] }>(
      `/projects/${projectId}/roles`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async createRole(projectId: string, data: CreateProjectRoleRequest): Promise<ProjectRole> {
    return this.requestProtectedWithAuth<ProjectRole>(`/projects/${projectId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async updateRole(projectId: string, roleId: string, data: UpdateProjectRoleRequest): Promise<ProjectRole> {
    return this.requestProtectedWithAuth<ProjectRole>(`/projects/${projectId}/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteRole(projectId: string, roleId: string): Promise<void> {
    return this.requestProtectedWithAuth<void>(`/projects/${projectId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async getRolePermissions(projectId: string, roleId: string): Promise<RoleEndpointPermission[]> {
    const result = await this.requestProtected<RoleEndpointPermission[] | { data: RoleEndpointPermission[] }>(
      `/projects/${projectId}/roles/${roleId}/permissions`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async saveRolePermissions(
    projectId: string,
    roleId: string,
    permissions: RoleEndpointPermissionItem[],
  ): Promise<RoleEndpointPermission[]> {
    const result = await this.requestProtectedWithAuth<RoleEndpointPermission[] | { data: RoleEndpointPermission[] }>(
      `/projects/${projectId}/roles/${roleId}/permissions`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      },
    );
    return Array.isArray(result) ? result : result.data;
  }

  async getCrossRoleRules(projectId: string): Promise<CrossRoleDataRule[]> {
    const result = await this.requestProtected<CrossRoleDataRule[] | { data: CrossRoleDataRule[] }>(
      `/projects/${projectId}/role-rules`,
    );
    return Array.isArray(result) ? result : result.data;
  }

  async saveCrossRoleRules(projectId: string, rules: CrossRoleRuleItem[]): Promise<CrossRoleDataRule[]> {
    const result = await this.requestProtectedWithAuth<CrossRoleDataRule[] | { data: CrossRoleDataRule[] }>(
      `/projects/${projectId}/role-rules`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      },
    );
    return Array.isArray(result) ? result : result.data;
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

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
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

    const payload = this.unwrap<
      PreviewAndStartResponse | (PreviewData & { analysisId?: string; message?: string; preview?: PreviewData })
    >(await response.json());

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
    return this.requestProtectedBlob(`/analysis/${analysisId}/report/${format}`);
  }

  // ─── Performance Testing ─────────────────────────────────────────────────

  async getPerfPlans(projectId: string): Promise<Array<PerfTestPlan & { executionCount: number }>> {
    return this.requestProtected(`/projects/${projectId}/perf-plans`);
  }

  async createPerfPlan(projectId: string, data: CreatePerfPlanRequest): Promise<PerfTestPlan> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/perf-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getPerfPlan(projectId: string, planId: string): Promise<PerfTestPlan> {
    return this.requestProtected(`/projects/${projectId}/perf-plans/${planId}`);
  }

  async updatePerfPlan(projectId: string, planId: string, data: UpdatePerfPlanRequest): Promise<PerfTestPlan> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/perf-plans/${planId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deletePerfPlan(projectId: string, planId: string): Promise<void> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/perf-plans/${planId}`, {
      method: 'DELETE',
    });
  }

  async startPerfExecution(projectId: string, planId: string, note?: string): Promise<{ executionId: string }> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/perf-plans/${planId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
  }

  async getPerfExecutionsByPlan(projectId: string, planId: string): Promise<PerfExecution[]> {
    return this.requestProtected(`/projects/${projectId}/perf-plans/${planId}/executions`);
  }

  async getPerfExecution(projectId: string, executionId: string): Promise<PerfExecution & { summary?: PerfRunSummary | null }> {
    return this.requestProtected(`/projects/${projectId}/perf-executions/${executionId}`);
  }

  async getPerfExecutionStatus(projectId: string, executionId: string): Promise<{ status: string; progress: unknown; error: string | null }> {
    return this.requestProtected(`/projects/${projectId}/perf-executions/${executionId}/status`);
  }

  async getPerfMetricWindows(
    projectId: string,
    executionId: string,
    page = 1,
    limit = 200,
  ): Promise<{ data: PerfMetricWindow[]; total: number }> {
    return this.requestProtected(
      `/projects/${projectId}/perf-executions/${executionId}/metrics?page=${page}&limit=${limit}`,
    );
  }

  async createPerfComparison(projectId: string, data: CreatePerfComparisonRequest): Promise<PerfComparisonReport> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/perf-executions/comparisons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // ─── Flow Testing ──────────────────────────────────────────────────────

  async getFlows(projectId: string): Promise<FlowDefinition[]> {
    return this.requestProtected(`/projects/${projectId}/flows`);
  }

  async createFlow(projectId: string, data: CreateFlowRequest): Promise<FlowDefinition> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getFlow(projectId: string, flowId: string): Promise<FlowDefinition> {
    return this.requestProtected(`/projects/${projectId}/flows/${flowId}`);
  }

  async updateFlow(projectId: string, flowId: string, data: UpdateFlowRequest): Promise<FlowDefinition> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async saveFlowCanvas(projectId: string, flowId: string, data: SaveCanvasRequest): Promise<FlowDefinition> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/canvas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async duplicateFlow(projectId: string, flowId: string): Promise<FlowDefinition> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/duplicate`, {
      method: 'POST',
    });
  }

  async deleteFlow(projectId: string, flowId: string): Promise<void> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}`, {
      method: 'DELETE',
    });
  }

  async startFlowExecution(projectId: string, flowId: string, data?: ExecuteFlowRequest): Promise<FlowExecution> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
  }

  async startFlowBatchExecution(projectId: string, flowId: string, data: ExecuteFlowBatchRequest): Promise<FlowExecutionBatch> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/executions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getFlowExecutions(projectId: string, flowId: string): Promise<FlowExecution[]> {
    return this.requestProtected(`/projects/${projectId}/flows/${flowId}/executions`);
  }

  async getFlowExecution(projectId: string, flowId: string, executionId: string): Promise<FlowExecution> {
    return this.requestProtected(`/projects/${projectId}/flows/${flowId}/executions/${executionId}`);
  }

  async cancelFlowExecution(projectId: string, flowId: string, executionId: string): Promise<void> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/executions/${executionId}/cancel`, {
      method: 'POST',
    });
  }

  async getFlowBatch(projectId: string, flowId: string, batchId: string): Promise<FlowExecutionBatch> {
    return this.requestProtected(`/projects/${projectId}/flows/${flowId}/executions/batches/${batchId}`);
  }

  async getFlowDatasets(projectId: string, flowId: string): Promise<FlowDataset[]> {
    return this.requestProtected(`/projects/${projectId}/flows/${flowId}/datasets`);
  }

  async createFlowDataset(projectId: string, flowId: string, data: CreateDatasetRequest): Promise<FlowDataset> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteFlowDataset(projectId: string, flowId: string, datasetId: string): Promise<void> {
    return this.requestProtectedWithAuth(`/projects/${projectId}/flows/${flowId}/datasets/${datasetId}`, {
      method: 'DELETE',
    });
  }

  private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return requestPublic<T>(this.getRequestContext(), path, options);
  }

  private async requestProtected<T>(path: string): Promise<T> {
    return requestProtectedResource<T>(this.getRequestContext(), path);
  }

  private async requestProtectedWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
    return requestProtectedWithAuthResource<T>(this.getRequestContext(), path, init);
  }

  private async fetchProtectedWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
    return fetchProtectedWithAuthRequest(this.getRequestContext(), path, init);
  }

  private async requestProtectedBlob(path: string): Promise<Blob> {
    return requestProtectedBlobResource(this.getRequestContext(), path);
  }

  private async retryAfterRefresh(url: string, init: RequestInit): Promise<Response | null> {
    return retryAfterRefreshRequest(this.getRequestContext(), url, init);
  }

  private handleUnauthorized(): void {
    this.unauthorizedHandler?.();
  }

  private extractRunIdFromLocation(locationHeader?: string | null): string | undefined {
    return extractRunIdFromLocation(locationHeader);
  }

  private unwrap<T>(raw: unknown): T {
    return unwrapEnvelope<T>(raw);
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    return extractErrorMessage(response);
  }
}
