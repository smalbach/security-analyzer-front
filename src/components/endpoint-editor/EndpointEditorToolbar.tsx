import type { CreateEndpointRequest } from '../../types/api';
import { Button, Input, LinkButton } from '../ui';
import { METHODS, METHOD_COLORS } from './constants';

interface EndpointEditorToolbarProps {
  projectId?: string;
  endpoint: Partial<CreateEndpointRequest>;
  sending: boolean;
  saving: boolean;
  isNew: boolean;
  saveError: string;
  sendError: string;
  onEndpointChange: (patch: Partial<CreateEndpointRequest>) => void;
  onSend: () => void;
  onSave: () => void;
}

export function EndpointEditorToolbar({
  projectId,
  endpoint,
  sending,
  saving,
  isNew,
  saveError,
  sendError,
  onEndpointChange,
  onSend,
  onSave,
}: EndpointEditorToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <LinkButton to={projectId ? `/projects/${projectId}` : '/projects'} variant="link" size="sm" className="hover:text-slate-300">
          {'<'} Back to project
        </LinkButton>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <select
            value={endpoint.method}
            onChange={(event) => onEndpointChange({ method: event.target.value })}
            className={`shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm font-bold outline-none focus:border-tide-400/50 ${METHOD_COLORS[endpoint.method ?? 'GET']}`}
          >
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <Input
            value={endpoint.path ?? ''}
            onChange={(event) => onEndpointChange({ path: event.target.value })}
            placeholder="/api/resource/{id}"
            className="min-w-0 flex-1 bg-black/30 font-mono"
          />

          <Button
            onClick={onSend}
            disabled={sending || isNew}
            title={isNew ? 'Save endpoint first' : 'Send request'}
          >
            {sending ? '...' : 'Send'}
          </Button>

          <Button variant="secondary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {saveError ? <p className="mt-2 text-xs text-red-400">{saveError}</p> : null}
        {sendError ? <p className="mt-2 text-xs text-red-400">{sendError}</p> : null}

        <div className="mt-3">
          <Input
            value={endpoint.description ?? ''}
            onChange={(event) => onEndpointChange({ description: event.target.value })}
            placeholder="Description (optional)"
            className="bg-white/3 text-slate-400"
          />
        </div>
      </div>
    </>
  );
}
