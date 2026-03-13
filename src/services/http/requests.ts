import { ApiUnauthorizedError } from './errors';
import { extractErrorMessage, unwrapEnvelope } from './helpers';
import type { ApiRequestContext, ApiRequestOptions } from './types';

function getAuthorizedHeaders(
  accessToken: string | null,
  headers?: HeadersInit,
): Record<string, string> {
  const nextHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  if (accessToken) {
    nextHeaders.Authorization = `Bearer ${accessToken}`;
  }

  return nextHeaders;
}

export async function retryAfterRefresh(
  context: ApiRequestContext,
  url: string,
  init: RequestInit,
): Promise<Response | null> {
  try {
    const refreshResult = await context.refreshToken();
    context.setAccessToken(refreshResult.accessToken);

    const retryHeaders = getAuthorizedHeaders(context.getAccessToken(), init.headers);

    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: retryHeaders,
    });
  } catch {
    return null;
  }
}

export async function request<T>(
  context: ApiRequestContext,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  let response = await fetch(`${context.baseUrl}${path}`, {
    credentials: 'include',
    headers: getAuthorizedHeaders(context.getAccessToken()),
  });

  if (response.status === 401 && options.retryOnUnauthorized && context.getAccessToken()) {
    const retryResponse = await retryAfterRefresh(context, `${context.baseUrl}${path}`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(context.getAccessToken()),
    });

    if (retryResponse) {
      response = retryResponse;
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401 && options.handleUnauthorized) {
      context.handleUnauthorized();
      throw new ApiUnauthorizedError(message);
    }
    throw new Error(message);
  }

  const raw = await response.json();
  return unwrapEnvelope<T>(raw);
}

export async function requestWithAuth<T>(
  context: ApiRequestContext,
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  let response = await fetch(`${context.baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: getAuthorizedHeaders(context.getAccessToken(), init.headers),
  });

  if (response.status === 401 && options.retryOnUnauthorized && context.getAccessToken()) {
    try {
      const refreshResult = await context.refreshToken();
      context.setAccessToken(refreshResult.accessToken);

      const retryResponse = await fetch(`${context.baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: getAuthorizedHeaders(context.getAccessToken(), init.headers),
      });

      if (!retryResponse.ok) {
        throw new Error(await extractErrorMessage(retryResponse));
      }

      const raw = await retryResponse.json();
      return unwrapEnvelope<T>(raw);
    } catch {
      throw new Error(await extractErrorMessage(response));
    }
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  const raw = JSON.parse(text);
  return unwrapEnvelope<T>(raw);
}

export async function requestProtected<T>(
  context: ApiRequestContext,
  path: string,
): Promise<T> {
  return request<T>(context, path, {
    retryOnUnauthorized: true,
    handleUnauthorized: true,
  });
}

export async function fetchProtectedWithAuth(
  context: ApiRequestContext,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let response = await fetch(`${context.baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: getAuthorizedHeaders(context.getAccessToken(), init.headers),
  });

  if (response.status === 401 && context.getAccessToken()) {
    const retryResponse = await retryAfterRefresh(context, `${context.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: getAuthorizedHeaders(context.getAccessToken(), init.headers),
    });

    if (retryResponse) {
      response = retryResponse;
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401) {
      context.handleUnauthorized();
      throw new ApiUnauthorizedError(message);
    }
    throw new Error(message);
  }

  return response;
}

export async function requestProtectedWithAuth<T>(
  context: ApiRequestContext,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchProtectedWithAuth(context, path, init);
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  const raw = JSON.parse(text);
  return unwrapEnvelope<T>(raw);
}

export async function requestProtectedBlob(
  context: ApiRequestContext,
  path: string,
): Promise<Blob> {
  let response = await fetch(`${context.baseUrl}${path}`, {
    credentials: 'include',
    headers: getAuthorizedHeaders(context.getAccessToken()),
  });

  if (response.status === 401 && context.getAccessToken()) {
    const retryResponse = await retryAfterRefresh(context, `${context.baseUrl}${path}`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(context.getAccessToken()),
    });

    if (retryResponse) {
      response = retryResponse;
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401) {
      context.handleUnauthorized();
      throw new ApiUnauthorizedError(message);
    }
    throw new Error(message);
  }

  return response.blob();
}
