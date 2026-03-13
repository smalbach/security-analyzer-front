export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api_key' | 'none';
  token?: string;
  username?: string;
  password?: string;
  header_name?: string;
  login_endpoint?: string;
  login_method?: string;
  login_body?: Record<string, unknown>;
  token_path?: string;
}
