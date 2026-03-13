export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiRequestOptions {
  retryOnUnauthorized?: boolean;
  handleUnauthorized?: boolean;
}

export interface ApiRequestContext {
  readonly baseUrl: string;
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  refreshToken(): Promise<{ accessToken: string }>;
  handleUnauthorized(): void;
}
