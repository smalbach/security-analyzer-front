import type { AuthResponse, AuthUser } from '../../types/api';
import { extractErrorMessage, unwrapEnvelope } from '../http/helpers';
import { request, requestWithAuth } from '../http/requests';
import type { ApiRequestContext } from '../http/types';

export async function login(
  context: ApiRequestContext,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return requestWithAuth<AuthResponse>(context, '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  context: ApiRequestContext,
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return requestWithAuth<AuthResponse>(context, '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout(context: ApiRequestContext): Promise<void> {
  await requestWithAuth<void>(context, '/auth/logout', { method: 'POST' });
}

export async function refreshToken(context: ApiRequestContext): Promise<{ accessToken: string }> {
  const response = await fetch(`${context.baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const raw = await response.json();
  return unwrapEnvelope<{ accessToken: string }>(raw);
}

export async function forgotPassword(
  context: ApiRequestContext,
  email: string,
): Promise<{ message: string }> {
  return requestWithAuth<{ message: string }>(context, '/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  context: ApiRequestContext,
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  return requestWithAuth<{ message: string }>(context, '/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function getProfile(context: ApiRequestContext): Promise<AuthUser> {
  return request<AuthUser>(context, '/auth/me');
}
