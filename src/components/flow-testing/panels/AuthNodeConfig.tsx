import { ConfigField, ConfigInput, ConfigSelect } from './ConfigField';
import { EndpointPicker } from './EndpointPicker';
import { JsonEditor } from './JsonEditor';
import { TemplateInput } from './TemplateInput';
import { AvailableVariables } from './AvailableVariables';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import type { ApiEndpoint } from '../../../types/api';

interface AuthNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

export function AuthNodeConfig({ config, onChange, projectId }: AuthNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });
  const completions = useTemplateCompletions(projectId);

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
      <AvailableVariables projectId={projectId} />

      <ConfigField label="Select from endpoints" help="Pick an existing login endpoint from your project. Its method, headers, and body will be auto-filled.">
        <EndpointPicker
          projectId={projectId}
          currentUrl={String(config.loginUrl || '')}
          currentMethod={String(config.method || 'POST')}
          onSelect={handleEndpointSelect}
        />
      </ConfigField>

      <ConfigField label="Login URL" help="Enter a path like /auth/login — the base URL from your environment (baseUrl, apiUrl, etc.) is prepended automatically. Full URLs (https://...) are used as-is. Supports {{env.key}} templates and {param} path parameters. Type {{ to see available variables.">
        <TemplateInput
          value={String(config.loginUrl || '')}
          onChange={(v) => update('loginUrl', v)}
          completions={completions}
          placeholder="/auth/login"
        />
      </ConfigField>

      <ConfigField label="Method">
        <ConfigSelect value={String(config.method || 'POST')} onChange={(v) => update('method', v)}
          options={[{ value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' }]} />
      </ConfigField>

      <ConfigField label="Headers (JSON)" help="HTTP headers as JSON. Supports {{env.key}}, {{var.key}}, and {{nodeId.extractor}} templates. Type {{ inside a value to see available variables.">
        <JsonEditor
          value={typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers || {}, null, 2)}
          onChange={(raw) => { try { update('headers', JSON.parse(raw)); } catch { update('headers', raw); } }}
          placeholder='{"Content-Type": "application/json"}'
          minHeight="80px"
          templateCompletions={completions}
        />
      </ConfigField>

      <ConfigField label="Body (JSON)" help="Login request body as JSON. Use {{env.testEmail}}, {{env.testPassword}} for credentials from environment. Type {{ to see available variables.">
        <JsonEditor
          value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body || {}, null, 2)}
          onChange={(raw) => { try { update('body', JSON.parse(raw)); } catch { update('body', raw); } }}
          placeholder='{"email": "{{env.testEmail}}", "password": "{{env.testPassword}}"}'
          minHeight="100px"
          templateCompletions={completions}
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
