import { ConfigField, ConfigInput, ConfigTextarea, ConfigSelect } from './ConfigField';
import { EndpointPicker } from './EndpointPicker';
import type { ApiEndpoint } from '../../../types/api';

interface AuthNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

export function AuthNodeConfig({ config, onChange, projectId }: AuthNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });

  const handleEndpointSelect = (ep: ApiEndpoint) => {
    onChange({
      ...config,
      loginUrl: ep.path,
      method: ep.method,
      headers: ep.parameters?.headers?.reduce((acc: Record<string, string>, h: any) => {
        acc[h.name] = h.value || '';
        return acc;
      }, { 'Content-Type': 'application/json' }) ?? { 'Content-Type': 'application/json' },
      body: ep.parameters?.body?.example ?? config.body ?? {},
    });
  };

  return (
    <div className="space-y-3">
      <ConfigField label="Select from endpoints" help="Pick an existing login endpoint from your project. Its method, headers, and body will be auto-filled.">
        <EndpointPicker
          projectId={projectId}
          currentUrl={String(config.loginUrl || '')}
          currentMethod={String(config.method || 'POST')}
          onSelect={handleEndpointSelect}
        />
      </ConfigField>

      <ConfigField label="Login URL" help="The full URL or path to the login endpoint. Supports {{env.key}} template variables.">
        <ConfigInput value={String(config.loginUrl || '')} onChange={(v) => update('loginUrl', v)} placeholder="{{env.baseUrl}}/auth/login" mono />
      </ConfigField>

      <ConfigField label="Method">
        <ConfigSelect value={String(config.method || 'POST')} onChange={(v) => update('method', v)}
          options={[{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }]} />
      </ConfigField>

      <ConfigField label="Headers (JSON)" help="HTTP headers sent with the login request. JSON format.">
        <ConfigTextarea
          value={typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers || {}, null, 2)}
          onChange={(v) => { try { update('headers', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder='{"Content-Type": "application/json"}'
        />
      </ConfigField>

      <ConfigField label="Body (JSON)" help="Request body for authentication. Typically contains email/username and password.">
        <ConfigTextarea
          value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body || {}, null, 2)}
          onChange={(v) => { try { update('body', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder='{"email": "{{env.testEmail}}", "password": "{{env.testPassword}}"}'
        />
      </ConfigField>

      <ConfigField label="Token Path" help="JSONPath to extract the token from the response body. Example: 'token', 'data.accessToken', 'auth.jwt'.">
        <ConfigInput value={String(config.tokenPath || '')} onChange={(v) => update('tokenPath', v)} placeholder="token or data.accessToken" mono />
      </ConfigField>

      <ConfigField label="Auth Header Name" help="Header name used to inject the token into downstream requests. Default: Authorization.">
        <ConfigInput value={String(config.headerName || '')} onChange={(v) => update('headerName', v)} placeholder="Authorization (default)" />
      </ConfigField>

      <ConfigField label="Token Type" help="Prefix added before the token value. Default: Bearer. Set empty for raw token.">
        <ConfigInput value={String(config.tokenType || '')} onChange={(v) => update('tokenType', v)} placeholder="Bearer (default)" />
      </ConfigField>
    </div>
  );
}
