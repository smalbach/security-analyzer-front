import type { AuthConfig, HttpMethod } from '../../types/api';

export const AUTH_LOGIN_METHODS: HttpMethod[] = ['POST', 'GET', 'PUT', 'PATCH'];

export function getAuthConfigLoginBodyText(authConfig?: AuthConfig | null): string {
  if (!authConfig?.login_body) {
    return '';
  }

  try {
    return JSON.stringify(authConfig.login_body, null, 2);
  } catch {
    return '';
  }
}

export function buildAuthConfigPayload(
  authType: AuthConfig['type'],
  authConfig: AuthConfig,
  loginBodyText: string,
): { authConfig?: AuthConfig; error?: string } {
  if (authType === 'none') {
    return {};
  }

  const payload: AuthConfig = { type: authType };

  if (authType === 'bearer') {
    assignIfPresent(payload, 'token', authConfig.token);
    assignIfPresent(payload, 'login_endpoint', authConfig.login_endpoint);
    assignIfPresent(payload, 'token_path', authConfig.token_path);
    const hasLoginFlow =
      Boolean(authConfig.login_endpoint?.trim()) ||
      Boolean(loginBodyText.trim());
    if (hasLoginFlow) {
      payload.login_method = authConfig.login_method?.trim().toUpperCase() || 'POST';
    } else {
      assignIfPresent(payload, 'login_method', authConfig.login_method?.toUpperCase());
    }

    const loginBodyResult = parseLoginBody(loginBodyText);
    if (loginBodyResult.error) {
      return { error: loginBodyResult.error };
    }
    if (loginBodyResult.value) {
      payload.login_body = loginBodyResult.value;
    }
  }

  if (authType === 'basic') {
    assignIfPresent(payload, 'username', authConfig.username);
    assignIfPresent(payload, 'password', authConfig.password);
  }

  if (authType === 'api_key') {
    assignIfPresent(payload, 'header_name', authConfig.header_name || 'X-API-Key');
    assignIfPresent(payload, 'token', authConfig.token);
  }

  return { authConfig: payload };
}

function parseLoginBody(value: string): { value?: Record<string, unknown>; error?: string } {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmedValue);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { error: 'Login body must be a valid JSON object.' };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: 'Login body must be valid JSON.' };
  }
}

function assignIfPresent<T extends keyof AuthConfig>(
  payload: AuthConfig,
  key: T,
  value: AuthConfig[T] | undefined,
): void {
  if (typeof value !== 'string') {
    return;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return;
  }

  payload[key] = trimmedValue as AuthConfig[T];
}
