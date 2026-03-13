import type { ApiEnvelope } from './types';

export function unwrapEnvelope<T>(raw: unknown): T {
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

export function extractRunIdFromLocation(locationHeader?: string | null): string | undefined {
  if (!locationHeader) {
    return undefined;
  }

  const normalizedLocation = locationHeader.replace(/\/$/, '');
  const segments = normalizedLocation.split('/');
  const lastSegment = segments[segments.length - 1];
  return lastSegment || undefined;
}

export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };

    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message || payload.error;

    if (message) {
      return `API ${response.status}: ${message}`;
    }
  } catch {
    // Fall back to the HTTP status text.
  }

  return `API ${response.status}: ${response.statusText || 'Request failed'}`;
}
