import type { CreateProjectRequest, Project, UpdateProjectRequest } from '../../types/api';
import { requestProtected, requestProtectedWithAuth } from '../http/requests';
import type { ApiRequestContext } from '../http/types';

export async function createProject(
  context: ApiRequestContext,
  data: CreateProjectRequest,
): Promise<Project> {
  return requestProtectedWithAuth<Project>(context, '/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getProjects(
  context: ApiRequestContext,
  params?: { page?: number; limit?: number },
): Promise<{ data: Project[] }> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  const qs = query.toString();

  const result = await requestProtected<Project[] | { data: Project[] }>(
    context,
    `/projects${qs ? `?${qs}` : ''}`,
  );
  return Array.isArray(result) ? { data: result } : result;
}

export async function getProject(context: ApiRequestContext, id: string): Promise<Project> {
  return requestProtected<Project>(context, `/projects/${id}`);
}

export async function updateProject(
  context: ApiRequestContext,
  id: string,
  data: UpdateProjectRequest,
): Promise<Project> {
  return requestProtectedWithAuth<Project>(context, `/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteProject(context: ApiRequestContext, id: string): Promise<void> {
  return requestProtectedWithAuth<void>(context, `/projects/${id}`, { method: 'DELETE' });
}
