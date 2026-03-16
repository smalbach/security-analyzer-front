import { useState, useEffect } from 'react';
import { ConfigField, ConfigSelect } from './ConfigField';
import { EndpointPicker } from './EndpointPicker';
import { JsonEditor } from './JsonEditor';
import { SchemaBuilder } from './SchemaBuilder';
import { TemplateInput } from './TemplateInput';
import { AvailableVariables } from './AvailableVariables';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import { KeyValueTable } from '../../endpoint-editor/KeyValueTable';
import { VariableMappingEditor } from './VariableMappingEditor';
import type { KVPair } from '../../endpoint-editor/types';
import type { ApiEndpoint } from '../../../types/api';

interface RequestNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

/** Convert Record<string, string> → KVPair[] */
function recordToKVPairs(record: unknown): KVPair[] {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
  return Object.entries(record as Record<string, string>).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
    enabled: true,
  }));
}

/** Convert KVPair[] → Record<string, string>, filtering disabled */
function kvPairsToRecord(pairs: KVPair[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    if (pair.enabled && pair.key.trim()) {
      result[pair.key] = pair.value;
    }
  }
  return result;
}

export function RequestNodeConfig({ config, onChange, projectId }: RequestNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });
  const completions = useTemplateCompletions(projectId);

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

  // Local state for KVPair rows — preserves empty rows while editing
  const [localHeaderRows, setLocalHeaderRows] = useState<KVPair[]>(() => recordToKVPairs(config.headers));
  const [localQueryRows, setLocalQueryRows] = useState<KVPair[]>(() => recordToKVPairs(config.queryParams));

  // Sync from external config changes (e.g. endpoint picker selecting a new endpoint)
  useEffect(() => {
    const configRecord = (config.headers && typeof config.headers === 'object' && !Array.isArray(config.headers))
      ? config.headers as Record<string, string>
      : {};
    const localRecord = kvPairsToRecord(localHeaderRows);
    if (JSON.stringify(localRecord) !== JSON.stringify(configRecord)) {
      setLocalHeaderRows(recordToKVPairs(config.headers));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.headers]);

  useEffect(() => {
    const configRecord = (config.queryParams && typeof config.queryParams === 'object' && !Array.isArray(config.queryParams))
      ? config.queryParams as Record<string, string>
      : {};
    const localRecord = kvPairsToRecord(localQueryRows);
    if (JSON.stringify(localRecord) !== JSON.stringify(configRecord)) {
      setLocalQueryRows(recordToKVPairs(config.queryParams));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.queryParams]);

  const handleHeaderChange = (rows: KVPair[]) => {
    setLocalHeaderRows(rows);
    update('headers', kvPairsToRecord(rows));
  };

  const handleQueryChange = (rows: KVPair[]) => {
    setLocalQueryRows(rows);
    update('queryParams', kvPairsToRecord(rows));
  };

  return (
    <div className="space-y-3">
      <AvailableVariables projectId={projectId} variableMappings={mappings} />

      <ConfigField label="Select from endpoints" help="Pick an existing endpoint from your project. Its method, URL, headers, query params, and body will be auto-filled.">
        <EndpointPicker
          projectId={projectId}
          currentUrl={String(config.url || '')}
          currentMethod={String(config.method || 'GET')}
          onSelect={handleEndpointSelect}
        />
      </ConfigField>

      <ConfigField label="URL" help="Enter a path like /api/users or /v2/campaigns/{id} — the base URL from your environment is prepended automatically. Use {param} for path parameters (resolved from env vars or upstream extractors), {{env.key}} for templates. Full URLs (https://...) are used as-is.">
        <TemplateInput
          value={String(config.url || '')}
          onChange={(v) => update('url', v)}
          completions={completions}
          placeholder="/api/users/{userId}"
        />
      </ConfigField>

      <ConfigField label="Method">
        <ConfigSelect value={String(config.method || 'GET')} onChange={(v) => update('method', v)}
          options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => ({ value: m, label: m }))} />
      </ConfigField>

      <ConfigField label="Headers" help={'Add HTTP headers as key-value pairs. Values support {{env.key}}, {{var.key}}, and {{nodeId.extractor}} templates. Type {{ to see available variables.'}>
        <KeyValueTable
          rows={localHeaderRows}
          onChange={handleHeaderChange}
          templateCompletions={completions}
          compact
        />
      </ConfigField>

      <ConfigField label="Query Params" help="URL query params as key-value pairs. Supports {{env.key}}, {{var.key}}, and {{nodeId.extractor}} templates. Type {{ to see available variables.">
        <KeyValueTable
          rows={localQueryRows}
          onChange={handleQueryChange}
          templateCompletions={completions}
          compact
        />
      </ConfigField>

      <ConfigField label="Body (JSON)" help="Request body as JSON. Supports {{env.key}}, {{var.key}}, and {{nodeId.extractor}} templates. Type {{ to see available variables.">
        <JsonEditor
          value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body || null, null, 2)}
          onChange={(raw) => { try { update('body', JSON.parse(raw)); } catch { update('body', raw); } }}
          placeholder='{"name": "Test"}'
          minHeight="100px"
          templateCompletions={completions}
        />
      </ConfigField>

      <ConfigField label="Response Schema" help="Define a JSON Schema to validate the response structure. Use the visual editor to add fields or switch to raw JSON. Errors = missing/wrong types, Warnings = extra fields (contract drift).">
        <SchemaBuilder
          value={typeof config.responseSchema === 'string' ? (() => { try { return JSON.parse(config.responseSchema); } catch { return null; } })() : config.responseSchema}
          onChange={(schema) => update('responseSchema', schema)}
        />
      </ConfigField>

      {/* Variable mappings */}
      <ConfigField label="Variable Mappings" help="Map values from upstream nodes into this request. Select a source node and its extractor, then specify where the value should go in this request.">
        <VariableMappingEditor
          mappings={mappings}
          onChange={(updated) => onChange({ ...config, variableMappings: updated })}
          projectId={projectId}
        />
      </ConfigField>
    </div>
  );
}
