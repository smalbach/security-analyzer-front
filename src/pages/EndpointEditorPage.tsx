import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SecurityRuleSelector } from '../components/SecurityRuleSelector';
import type { CreateEndpointRequest, TestEndpointResponse, RuleSelection } from '../types/api';

type Tab = 'params' | 'headers' | 'body' | 'auth' | 'security';
type ResponseTab = 'body' | 'headers';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-sky-400',
  PUT: 'text-amber-400',
  PATCH: 'text-violet-400',
  DELETE: 'text-red-400',
  OPTIONS: 'text-slate-400',
  HEAD: 'text-slate-400',
};

const STATUS_COLOR = (code: number) => {
  if (code < 300) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (code < 400) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  if (code < 500) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
};

type KVPair = { key: string; value: string; enabled: boolean };

function KVTable({ rows, onChange }: { rows: KVPair[]; onChange: (rows: KVPair[]) => void }) {
  const add = () => onChange([...rows, { key: '', value: '', enabled: true }]);
  const update = (i: number, patch: Partial<KVPair>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
            className="h-3.5 w-3.5 accent-tide-500"
          />
          <input
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="Key"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-tide-400/50"
          />
          <input
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Value"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-tide-400/50"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 text-slate-500 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="mt-1 text-xs text-tide-400 hover:text-tide-200"
      >
        + Add row
      </button>
    </div>
  );
}

export function EndpointEditorPage() {
  const { projectId, endpointId } = useParams<{ projectId: string; endpointId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();

  const isNew = endpointId === 'new';

  const [endpoint, setEndpoint] = useState<Partial<CreateEndpointRequest>>({
    method: 'GET',
    path: '/',
    description: '',
    requiresAuth: false,
    tags: [],
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('params');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');

  // Request state
  const [queryRows, setQueryRows] = useState<KVPair[]>([]);
  const [headerRows, setHeaderRows] = useState<KVPair[]>([]);
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [selectedRules, setSelectedRules] = useState<RuleSelection>({});

  // Response state
  const [response, setResponse] = useState<TestEndpointResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Detect path params from path template
  const detectedPathParams = Array.from(
    endpoint.path?.matchAll(/\{(\w+)\}/g) ?? [],
  ).map((m) => m[1]);

  const fetchEndpoint = useCallback(async () => {
    if (isNew || !projectId || !endpointId) return;
    try {
      const ep = await api.getEndpoint(projectId, endpointId);
      setEndpoint({
        method: ep.method,
        path: ep.path,
        description: ep.description ?? '',
        requiresAuth: ep.requiresAuth,
        tags: ep.tags,
        parameters: ep.parameters ?? undefined,
      });
      // Pre-fill query rows from saved parameters
      if (ep.parameters?.query) {
        setQueryRows(ep.parameters.query.map((q) => ({ key: q.name, value: q.example ?? '', enabled: true })));
      }
      if (ep.parameters?.headers) {
        setHeaderRows(ep.parameters.headers.map((h) => ({ key: h.name, value: h.value, enabled: true })));
      }
      if (ep.parameters?.body?.example) {
        setBodyText(JSON.stringify(ep.parameters.body.example, null, 2));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [api, projectId, endpointId, isNew]);

  useEffect(() => { void fetchEndpoint(); }, [fetchEndpoint]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload: CreateEndpointRequest = {
        method: endpoint.method ?? 'GET',
        path: endpoint.path ?? '/',
        description: endpoint.description,
        requiresAuth: endpoint.requiresAuth,
        tags: endpoint.tags,
        parameters: {
          query: queryRows.filter((r) => r.key).map((r) => ({
            name: r.key,
            type: 'string' as const,
            required: false,
            example: r.value,
          })),
          headers: headerRows.filter((r) => r.key).map((r) => ({
            name: r.key,
            value: r.value,
            required: false,
          })),
          body: bodyText
            ? {
                content_type: 'application/json',
                example: (() => { try { return JSON.parse(bodyText); } catch { return bodyText; } })(),
              }
            : undefined,
        },
      };
      if (isNew) {
        const created = await api.createEndpoint(projectId, payload);
        navigate(`/projects/${projectId}/endpoints/${created.id}`, { replace: true });
      } else if (endpointId) {
        await api.updateEndpoint(projectId, endpointId, payload);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save endpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!projectId || !endpointId || isNew) return;
    setSending(true);
    setSendError('');
    setResponse(null);
    try {
      const res = await api.testEndpoint(projectId, endpointId, {
        pathParams: { ...pathParams },
        queryParams: Object.fromEntries(queryRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value])),
        headers: Object.fromEntries(headerRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value])),
        body: bodyText ? (() => { try { return JSON.parse(bodyText); } catch { return bodyText; } })() : undefined,
        authToken: authToken || undefined,
        rules: Object.entries(selectedRules).filter(([, v]) => v).map(([k]) => k),
      });
      setResponse(res);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading endpoint...</div>;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'security', label: 'Security Rules' },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button type="button" onClick={() => navigate(`/projects/${projectId}`)} className="hover:text-slate-300">
          ← Back to project
        </button>
      </div>

      {/* URL Bar */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <select
            value={endpoint.method}
            onChange={(e) => setEndpoint({ ...endpoint, method: e.target.value })}
            className={`shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm font-bold outline-none focus:border-tide-400/50 ${METHOD_COLORS[endpoint.method ?? 'GET']}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            value={endpoint.path ?? ''}
            onChange={(e) => setEndpoint({ ...endpoint, path: e.target.value })}
            placeholder="/api/resource/{id}"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
          />

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || isNew}
            title={isNew ? 'Save endpoint first' : 'Send request'}
            className="shrink-0 rounded-xl bg-tide-600/80 px-5 py-2 text-sm font-medium text-white hover:bg-tide-500/80 disabled:opacity-40"
          >
            {sending ? '...' : 'Send'}
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {saveError && (
          <p className="mt-2 text-xs text-red-400">{saveError}</p>
        )}
        {sendError && (
          <p className="mt-2 text-xs text-red-400">{sendError}</p>
        )}

        <div className="mt-3">
          <input
            value={endpoint.description ?? ''}
            onChange={(e) => setEndpoint({ ...endpoint, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full rounded-xl border border-white/10 bg-white/3 px-3 py-1.5 text-sm text-slate-400 outline-none focus:border-tide-400/30"
          />
        </div>
      </div>

      {/* Tabs + Response */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Request Config */}
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
          <div className="flex gap-1 border-b border-white/10 px-4 pt-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t-lg px-3 py-2 text-sm transition ${
                  tab === t.id
                    ? 'border-b-2 border-tide-400 text-tide-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'params' && (
              <div className="space-y-4">
                {detectedPathParams.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Path Params</p>
                    <div className="space-y-1.5">
                      {detectedPathParams.map((param) => (
                        <div key={param} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 font-mono text-xs text-tide-400">{`{${param}}`}</span>
                          <input
                            value={pathParams[param] ?? ''}
                            onChange={(e) => setPathParams({ ...pathParams, [param]: e.target.value })}
                            placeholder="value"
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-tide-400/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Query Params</p>
                  <KVTable rows={queryRows} onChange={setQueryRows} />
                </div>
              </div>
            )}

            {tab === 'headers' && (
              <KVTable rows={headerRows} onChange={setHeaderRows} />
            )}

            {tab === 'body' && (
              <div>
                <p className="mb-2 text-xs text-slate-500">Content-Type: application/json</p>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={12}
                  placeholder='{"key": "value"}'
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
                />
              </div>
            )}

            {tab === 'auth' && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bearer Token</p>
                <input
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="eyJ..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Overrides project auth for this request only.
                </p>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Select which security rules to run when testing this endpoint.
                </p>
                <SecurityRuleSelector value={selectedRules} onChange={setSelectedRules} />
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-slate-300">Response</span>
            {response && (
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${STATUS_COLOR(response.statusCode)}`}>
                  {response.statusCode}
                </span>
                <span className="text-xs text-slate-500">{response.durationMs}ms</span>
              </div>
            )}
          </div>

          {sending && (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-tide-400 border-t-transparent" />
            </div>
          )}

          {!sending && !response && (
            <div className="py-20 text-center text-sm text-slate-600">
              Send a request to see the response here.
            </div>
          )}

          {!sending && response && (
            <div className="p-4">
              <div className="mb-3 flex gap-2">
                {(['body', 'headers'] as ResponseTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setResponseTab(t)}
                    className={`rounded-lg px-3 py-1 text-xs transition ${
                      responseTab === t ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {responseTab === 'body' && (
                <pre className="max-h-80 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-xs text-slate-200">
                  {typeof response.body === 'string'
                    ? response.body
                    : JSON.stringify(response.body, null, 2)}
                </pre>
              )}

              {responseTab === 'headers' && (
                <div className="space-y-1 font-mono text-xs">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="shrink-0 text-tide-400">{k}:</span>
                      <span className="break-all text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
