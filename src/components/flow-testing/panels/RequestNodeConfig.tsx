import { ConfigField, ConfigInput, ConfigTextarea, ConfigSelect } from './ConfigField';
import { EndpointPicker } from './EndpointPicker';
import type { ApiEndpoint } from '../../../types/api';

interface RequestNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

export function RequestNodeConfig({ config, onChange, projectId }: RequestNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });

  const handleEndpointSelect = (ep: ApiEndpoint) => {
    const headers: Record<string, string> = {};
    ep.parameters?.headers?.forEach((h: any) => { headers[h.name] = h.value || ''; });
    const queryParams: Record<string, string> = {};
    ep.parameters?.query?.forEach((q: any) => { queryParams[q.name] = q.example || ''; });

    onChange({
      ...config,
      url: ep.path,
      method: ep.method,
      headers: Object.keys(headers).length > 0 ? headers : config.headers ?? {},
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : config.queryParams ?? {},
      body: ep.parameters?.body?.example ?? config.body ?? null,
    });
  };

  const mappings = (config.variableMappings || []) as Array<Record<string, unknown>>;

  const addMapping = () => {
    onChange({ ...config, variableMappings: [...mappings, { targetPath: '', sourceNodeId: '', sourceExpression: '' }] });
  };

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = mappings.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onChange({ ...config, variableMappings: updated });
  };

  const removeMapping = (index: number) => {
    onChange({ ...config, variableMappings: mappings.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <ConfigField label="Select from endpoints" help="Pick an existing endpoint from your project. Its method, URL, headers, query params, and body will be auto-filled.">
        <EndpointPicker
          projectId={projectId}
          currentUrl={String(config.url || '')}
          currentMethod={String(config.method || 'GET')}
          onSelect={handleEndpointSelect}
        />
      </ConfigField>

      <ConfigField label="URL" help="Request URL. Use {{env.baseUrl}} for the environment base URL, {{nodeId.extractorName}} for upstream values.">
        <ConfigInput value={String(config.url || '')} onChange={(v) => update('url', v)} placeholder="{{env.baseUrl}}/api/users" mono />
      </ConfigField>

      <ConfigField label="Method">
        <ConfigSelect value={String(config.method || 'GET')} onChange={(v) => update('method', v)}
          options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => ({ value: m, label: m }))} />
      </ConfigField>

      <ConfigField label="Headers (JSON)" help="HTTP headers. JSON key-value pairs.">
        <ConfigTextarea
          value={typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers || {}, null, 2)}
          onChange={(v) => { try { update('headers', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder='{"Content-Type": "application/json"}'
        />
      </ConfigField>

      <ConfigField label="Query Params (JSON)" help="URL query parameters as key-value pairs.">
        <ConfigTextarea
          value={typeof config.queryParams === 'string' ? config.queryParams : JSON.stringify(config.queryParams || {}, null, 2)}
          onChange={(v) => { try { update('queryParams', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder='{"page": "1", "limit": "10"}'
          rows={2}
        />
      </ConfigField>

      <ConfigField label="Body (JSON)" help="Request body. Supports template variables like {{env.key}} and {{nodeId.extractor}}.">
        <ConfigTextarea
          value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body || null, null, 2)}
          onChange={(v) => { try { update('body', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder='{"name": "Test"}'
        />
      </ConfigField>

      <ConfigField label="Response Schema (JSON Schema)" help="Paste a JSON Schema to validate the response structure. Errors = missing/wrong types, Warnings = extra fields (contract drift).">
        <ConfigTextarea
          value={typeof config.responseSchema === 'string' ? config.responseSchema : JSON.stringify(config.responseSchema || null, null, 2)}
          onChange={(v) => { try { update('responseSchema', JSON.parse(v)); } catch { /* keep raw */ } }}
          placeholder="Paste JSON Schema to validate response"
          rows={5}
        />
      </ConfigField>

      {/* Variable mappings */}
      <ConfigField label="Variable Mappings" help="Map values from upstream nodes into this request. Source uses {{nodeId.extractorName}} template syntax.">
        <div className="space-y-1.5">
          {mappings.map((m, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-1.5">
              <div className="flex gap-1">
                <input type="text" value={String(m.sourceNodeId || '')} onChange={(e) => updateMapping(i, 'sourceNodeId', e.target.value)}
                  placeholder="Source node ID" className="flex-1 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none placeholder:text-slate-500" />
                <button type="button" onClick={() => removeMapping(i)} className="text-xs text-red-400">&times;</button>
              </div>
              <input type="text" value={String(m.sourceExpression || '')} onChange={(e) => updateMapping(i, 'sourceExpression', e.target.value)}
                placeholder="Source: {{nodeId.extractorName}}" className="w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] text-slate-300 outline-none placeholder:text-slate-500" />
              <input type="text" value={String(m.targetPath || '')} onChange={(e) => updateMapping(i, 'targetPath', e.target.value)}
                placeholder="Target path in request" className="w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none placeholder:text-slate-500" />
            </div>
          ))}
          <button type="button" onClick={addMapping}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-1 text-[10px] text-slate-400 transition hover:bg-white/10">
            + Add Mapping
          </button>
        </div>
      </ConfigField>
    </div>
  );
}
