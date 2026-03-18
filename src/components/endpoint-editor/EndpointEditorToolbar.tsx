import type { CreateEndpointRequest } from '../../types/api';
import type { ProjectEnvironment } from '../../types/environments';
import { Button, Input, LinkButton } from '../ui';
import { VariableAutocomplete } from './VariableAutocomplete';
import { METHODS, METHOD_COLORS } from './constants';

interface EndpointEditorToolbarProps {
  projectId?: string;
  endpoint: Partial<CreateEndpointRequest>;
  sending: boolean;
  saving: boolean;
  isNew: boolean;
  saveError: string;
  sendError: string;
  activeEnv?: ProjectEnvironment | null;
  onEndpointChange: (patch: Partial<CreateEndpointRequest>) => void;
  onSend: () => void;
  onSave: () => void;
  onCurlExport: () => void;
}

function VariablePreview({ path, variables }: { path: string; variables: Record<string, string> }) {
  // Show preview for both {{envVar}} and {pathParam} that contain {{envVar}} values
  const hasVariables = /\{\{[a-zA-Z0-9_.\-]+\}\}/.test(path);
  if (!hasVariables) return null;

  const parts = path.split(/(\{\{[a-zA-Z0-9_.\-]+\}\})/g);

  return (
    <div className="mt-1.5 flex items-center gap-1 text-[10px]">
      <span className="shrink-0 text-slate-600">Resolved:</span>
      <span className="truncate font-mono">
        {parts.map((part, i) => {
          const match = part.match(/^\{\{([a-zA-Z0-9_.\-]+)\}\}$/);
          if (match) {
            const value = variables[match[1]];
            return (
              <span
                key={i}
                className={`rounded px-0.5 ${
                  value !== undefined
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {value !== undefined ? value : part}
              </span>
            );
          }
          return <span key={i} className="text-slate-500">{part}</span>;
        })}
      </span>
    </div>
  );
}

export function EndpointEditorToolbar({
  projectId,
  endpoint,
  sending,
  saving,
  isNew,
  saveError,
  sendError,
  activeEnv,
  onEndpointChange,
  onSend,
  onSave,
  onCurlExport,
}: EndpointEditorToolbarProps) {
  const envVariables: Record<string, string> = {};
  if (activeEnv) {
    for (const v of activeEnv.variables) {
      if (v.enabled) {
        const val = v.currentValue || v.defaultValue;
        envVariables[v.key] = v.sensitive ? '••••' : val;
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <LinkButton to={projectId ? `/projects/${projectId}` : '/projects'} variant="link" size="sm" className="hover:text-slate-300">
          {'<'} Back to project
        </LinkButton>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <select
            value={endpoint.method}
            onChange={(event) => onEndpointChange({ method: event.target.value })}
            className={`shrink-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-sm font-bold outline-none focus:border-tide-400/50 ${METHOD_COLORS[endpoint.method ?? 'GET']}`}
          >
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <VariableAutocomplete
            value={endpoint.path ?? ''}
            onChange={(val) => onEndpointChange({ path: val })}
            variables={activeEnv?.variables ?? []}
            placeholder="/api/resource/{id} or {{baseUrl}}/resource"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-tide-400/50"
          />
        </div>

        <VariablePreview path={endpoint.path ?? ''} variables={envVariables} />

        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input
            value={endpoint.description ?? ''}
            onChange={(event) => onEndpointChange({ description: event.target.value })}
            placeholder="Description (optional)"
            className="min-w-0 flex-1 bg-white/3 px-3 py-1.5 text-sm text-slate-300"
          />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={onSend}
              disabled={sending || isNew}
              title={isNew ? 'Save endpoint first' : 'Send request'}
            >
              {sending ? '...' : 'Send'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onCurlExport}
              disabled={isNew}
              title="Export as cURL command"
            >
              cURL
            </Button>

            <Button size="sm" variant="secondary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {saveError ? <p className="mt-2 text-xs text-red-400">{saveError}</p> : null}
        {sendError ? <p className="mt-1 text-xs text-red-400">{sendError}</p> : null}
      </div>
    </>
  );
}
