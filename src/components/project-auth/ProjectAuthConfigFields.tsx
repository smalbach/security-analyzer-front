import type { AuthConfig } from '../../types/api';
import { FormField, Input, Select, Textarea } from '../ui';
import { AUTH_LOGIN_METHODS } from './authConfig';

interface ProjectAuthConfigFieldsProps {
  authType: AuthConfig['type'];
  authConfig: AuthConfig;
  loginBodyText: string;
  onAuthTypeChange: (value: AuthConfig['type']) => void;
  onAuthConfigChange: (patch: Partial<AuthConfig>) => void;
  onLoginBodyTextChange: (value: string) => void;
}

export function ProjectAuthConfigFields({
  authType,
  authConfig,
  loginBodyText,
  onAuthTypeChange,
  onAuthConfigChange,
  onLoginBodyTextChange,
}: ProjectAuthConfigFieldsProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/3 p-4">
      <p className="text-sm font-medium text-slate-300">Authentication</p>

      <FormField label="Type" htmlFor="project-auth-type" labelClassName="text-xs text-slate-500">
        <Select
          id="project-auth-type"
          value={authType}
          onChange={(event) => {
            const nextType = event.target.value as AuthConfig['type'];
            onAuthTypeChange(nextType);
            if (nextType === 'api_key' && !authConfig.header_name) {
              onAuthConfigChange({ header_name: 'X-API-Key' });
            }
          }}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="api_key">API Key</option>
        </Select>
      </FormField>

      {authType === 'bearer' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Static token" htmlFor="project-auth-token" labelClassName="text-xs text-slate-500">
            <Input
              id="project-auth-token"
              value={authConfig.token ?? ''}
              onChange={(event) => onAuthConfigChange({ token: event.target.value })}
              className="font-mono"
              placeholder="eyJ..."
            />
          </FormField>

          <FormField
            label="Token path"
            htmlFor="project-auth-token-path"
            labelClassName="text-xs text-slate-500"
            hint="Dot path in the login response, for example data.access_token"
          >
            <Input
              id="project-auth-token-path"
              value={authConfig.token_path ?? ''}
              onChange={(event) => onAuthConfigChange({ token_path: event.target.value })}
              className="font-mono"
              placeholder="data.access_token"
            />
          </FormField>

          <FormField
            label="Login endpoint"
            htmlFor="project-auth-login-endpoint"
            labelClassName="text-xs text-slate-500"
          >
            <Input
              id="project-auth-login-endpoint"
              value={authConfig.login_endpoint ?? ''}
              onChange={(event) => onAuthConfigChange({ login_endpoint: event.target.value })}
              className="font-mono"
              placeholder="https://api.example.com/auth/login"
            />
          </FormField>

          <FormField
            label="Login method"
            htmlFor="project-auth-login-method"
            labelClassName="text-xs text-slate-500"
          >
            <Select
              id="project-auth-login-method"
              value={authConfig.login_method ?? 'POST'}
              onChange={(event) => onAuthConfigChange({ login_method: event.target.value })}
            >
              {AUTH_LOGIN_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Login body JSON"
            htmlFor="project-auth-login-body"
            labelClassName="text-xs text-slate-500"
            className="md:col-span-2"
            hint="Optional JSON body used to request the bearer token."
          >
            <Textarea
              id="project-auth-login-body"
              value={loginBodyText}
              onChange={(event) => onLoginBodyTextChange(event.target.value)}
              className="font-mono"
              rows={5}
              placeholder={'{\n  "email": "user@example.com",\n  "password": "secret"\n}'}
            />
          </FormField>
        </div>
      ) : null}

      {authType === 'basic' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Username" htmlFor="project-basic-username" labelClassName="text-xs text-slate-500">
            <Input
              id="project-basic-username"
              value={authConfig.username ?? ''}
              onChange={(event) => onAuthConfigChange({ username: event.target.value })}
            />
          </FormField>
          <FormField label="Password" htmlFor="project-basic-password" labelClassName="text-xs text-slate-500">
            <Input
              id="project-basic-password"
              type="password"
              value={authConfig.password ?? ''}
              onChange={(event) => onAuthConfigChange({ password: event.target.value })}
            />
          </FormField>
        </div>
      ) : null}

      {authType === 'api_key' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Header name" htmlFor="project-api-key-header" labelClassName="text-xs text-slate-500">
            <Input
              id="project-api-key-header"
              value={authConfig.header_name ?? 'X-API-Key'}
              onChange={(event) => onAuthConfigChange({ header_name: event.target.value })}
              className="font-mono"
            />
          </FormField>
          <FormField label="API key" htmlFor="project-api-key-token" labelClassName="text-xs text-slate-500">
            <Input
              id="project-api-key-token"
              value={authConfig.token ?? ''}
              onChange={(event) => onAuthConfigChange({ token: event.target.value })}
              className="font-mono"
            />
          </FormField>
        </div>
      ) : null}
    </div>
  );
}
