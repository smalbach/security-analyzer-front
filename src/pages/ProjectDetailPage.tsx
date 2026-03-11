import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SecurityRuleSelector } from '../components/SecurityRuleSelector';
import type {
  Project,
  ApiEndpoint,
  TestRun,
  StartTestRunRequest,
  RuleSelection,
  TestCredential,
  AuthConfig,
} from '../types/api';

type Tab = 'endpoints' | 'test-runs' | 'settings';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  HEAD: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  running: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  failed: 'bg-red-500/20 text-red-200 border-red-400/40',
};

// ─── Endpoints Tab ────────────────────────────────────────────────────────────

function EndpointsTab({ project }: { project: Project }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [curlInput, setCurlInput] = useState('');
  const [curlImporting, setCurlImporting] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);

  const fetchEndpoints = useCallback(async () => {
    try {
      const eps = await api.getEndpoints(project.id);
      setEndpoints(eps);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => { void fetchEndpoints(); }, [fetchEndpoints]);

  const handleImportFile = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    try {
      const result = await api.importEndpointsFromFile(project.id, importFile);
      setEndpoints((prev) => [...prev, ...result.endpoints]);
      setImportFile(null);
      setShowImportPanel(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCurl = async () => {
    if (!curlInput.trim()) return;
    setCurlImporting(true);
    try {
      const ep = await api.importEndpointsFromCurl(project.id, curlInput.trim());
      setEndpoints((prev) => [...prev, ep]);
      setCurlInput('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'cURL import failed');
    } finally {
      setCurlImporting(false);
    }
  };

  const handleDelete = async (epId: string) => {
    if (!confirm('Delete this endpoint?')) return;
    try {
      await api.deleteEndpoint(project.id, epId);
      setEndpoints((prev) => prev.filter((e) => e.id !== epId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}/endpoints/new`)}
          className="rounded-xl bg-tide-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-tide-500/80"
        >
          + Add Endpoint
        </button>
        <button
          type="button"
          onClick={() => setShowImportPanel(!showImportPanel)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          Import
        </button>
      </div>

      {showImportPanel && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          {importError && (
            <p className="text-xs text-red-400">{importError}</p>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              From File (OpenAPI, Postman, Insomnia, Markdown)
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".yaml,.yml,.json,.md,.txt"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-white/5 file:px-3 file:py-1 file:text-xs file:text-slate-300"
              />
              <button
                type="button"
                onClick={() => void handleImportFile()}
                disabled={!importFile || importing}
                className="rounded-xl bg-tide-600/80 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">From cURL</p>
            <div className="flex gap-2">
              <input
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                placeholder='curl -X POST https://api.example.com/users -H "..."'
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
              />
              <button
                type="button"
                onClick={() => void handleImportCurl()}
                disabled={!curlInput.trim() || curlImporting}
                className="rounded-xl bg-tide-600/80 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {curlImporting ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading...</div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-slate-500">
          No endpoints yet. Add or import some.
        </div>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-tide-400/30"
            >
              <span className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${METHOD_COLOR[ep.method] ?? 'text-slate-400 bg-white/5 border-white/10'}`}>
                {ep.method}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/projects/${project.id}/endpoints/${ep.id}`)}
                className="min-w-0 flex-1 truncate text-left font-mono text-sm text-slate-200 hover:text-tide-300"
              >
                {ep.path}
              </button>
              {ep.description && (
                <span className="hidden text-xs text-slate-500 sm:block truncate max-w-xs">{ep.description}</span>
              )}
              <div className="hidden items-center gap-1.5 group-hover:flex">
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}/endpoints/${ep.id}`)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(ep.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Test Runs Tab ────────────────────────────────────────────────────────────

function StartTestRunModal({
  project,
  onClose,
  onStarted,
}: {
  project: Project;
  onClose: () => void;
  onStarted: (run: TestRun) => void;
}) {
  const { api } = useAuth();
  const [label, setLabel] = useState('');
  const [credentials, setCredentials] = useState<TestCredential[]>([
    { username: '', password: '', role: '' },
  ]);
  const [rules, setRules] = useState<RuleSelection>({
    bola_idor: true,
    bfla: true,
    auth_jwt: true,
    jwt_attack: true,
    cors: true,
    injection: true,
    mass_assignment: true,
    data_exposure: true,
    error_disclosure: true,
    verbose_error: true,
    rate_limit: false,
    security_headers: true,
    method_tampering: true,
    content_type: true,
    cross_user_access: true,
    endpoint_consistency: false,
    response_size_anomaly: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateCred = (i: number, patch: Partial<TestCredential>) =>
    setCredentials((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: StartTestRunRequest = {
        label: label || undefined,
        credentials: credentials.filter((c) => c.username),
        rules,
      };
      const run = await api.startTestRun(project.id, payload);
      onStarted(run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl border border-white/10 bg-slatewave-950 shadow-glass">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold">New Test Run</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl leading-none">✕</button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-slate-400">Label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
                placeholder="Sprint 12 security test"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm text-slate-400">Test Credentials</label>
                <button
                  type="button"
                  onClick={() => setCredentials((prev) => [...prev, { username: '', password: '', role: '' }])}
                  className="text-xs text-tide-400 hover:text-tide-200"
                >
                  + Add credential
                </button>
              </div>
              <div className="space-y-2">
                {credentials.map((c, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input
                      value={c.username}
                      onChange={(e) => updateCred(i, { username: e.target.value })}
                      placeholder="Username / email"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
                    />
                    <input
                      type="password"
                      value={c.password}
                      onChange={(e) => updateCred(i, { password: e.target.value })}
                      placeholder="Password"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
                    />
                    <input
                      value={c.role ?? ''}
                      onChange={(e) => updateCred(i, { role: e.target.value })}
                      placeholder="Role (e.g. admin)"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <SecurityRuleSelector value={rules} onChange={setRules} defaultCollapsed />
          </div>

          {/* Footer — always visible */}
          <div className="shrink-0 flex justify-end gap-2 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-tide-600/80 px-5 py-2 text-sm font-medium text-white hover:bg-tide-500/80 disabled:opacity-50"
            >
              {submitting ? 'Starting...' : 'Start Test Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestRunsTab({ project }: { project: Project }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await api.getTestRuns(project.id, { limit: 20 });
      setRuns(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => { void fetchRuns(); }, [fetchRuns]);

  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          onClick={() => setShowStart(true)}
          className="rounded-xl bg-tide-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-tide-500/80"
        >
          ▶ Start Test Run
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-slate-500">
          No test runs yet.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => navigate(`/projects/${project.id}/test-runs/${run.id}`)}
              className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-tide-400/30"
            >
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${STATUS_BADGE[run.status]}`}>
                {run.status}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {run.label ?? `Run ${run.id.slice(0, 8)}`}
              </span>
              {run.summary?.securityScore !== undefined && (
                <span className="shrink-0 text-sm font-bold text-tide-300">
                  Score: {run.summary.securityScore}
                </span>
              )}
              <span className="shrink-0 text-xs text-slate-500">
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : new Date(run.createdAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {showStart && (
        <StartTestRunModal
          project={project}
          onClose={() => setShowStart(false)}
          onStarted={(run) => {
            setRuns((prev) => [run, ...prev]);
            setShowStart(false);
            navigate(`/projects/${project.id}/test-runs/${run.id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ project, onUpdated }: { project: Project; onUpdated: (p: Project) => void }) {
  const { api } = useAuth();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    baseUrl: project.baseUrl ?? '',
    tags: (project.tags ?? []).join(', '),
  });
  const [authType, setAuthType] = useState<AuthConfig['type']>(project.authConfig?.type ?? 'none');
  const [authConfig, setAuthConfig] = useState<AuthConfig>(project.authConfig ?? { type: 'none' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.updateProject(project.id, {
        name: form.name,
        description: form.description || undefined,
        baseUrl: form.baseUrl || undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        authConfig: authType === 'none' ? undefined : { ...authConfig, type: authType },
      });
      onUpdated(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="max-w-lg space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Saved!</p>}

      <div>
        <label className="mb-1 block text-sm text-slate-400">Name *</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Base URL</label>
        <input
          value={form.baseUrl}
          onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
          placeholder="https://api.example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Tags (comma separated)</label>
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-300">Authentication</p>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Type</label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value as AuthConfig['type'])}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api_key">API Key</option>
          </select>
        </div>

        {authType === 'bearer' && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">Token</label>
            <input
              value={authConfig.token ?? ''}
              onChange={(e) => setAuthConfig({ ...authConfig, token: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
              placeholder="eyJ..."
            />
          </div>
        )}

        {authType === 'basic' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Username</label>
              <input
                value={authConfig.username ?? ''}
                onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Password</label>
              <input
                type="password"
                value={authConfig.password ?? ''}
                onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
              />
            </div>
          </div>
        )}

        {authType === 'api_key' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Header Name</label>
              <input
                value={authConfig.header_name ?? 'X-API-Key'}
                onChange={(e) => setAuthConfig({ ...authConfig, header_name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">API Key</label>
              <input
                value={authConfig.token ?? ''}
                onChange={(e) => setAuthConfig({ ...authConfig, token: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-tide-600/80 px-5 py-2 text-sm font-medium text-white hover:bg-tide-500/80 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const activeTab = (searchParams.get('tab') as Tab) ?? 'endpoints';
  const setTab = (tab: Tab) => setSearchParams({ tab });

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    api.getProject(projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [api, projectId]);

  if (loading) return <div className="py-20 text-center text-slate-500">Loading project...</div>;
  if (error) return <div className="py-20 text-center text-red-400">{error}</div>;
  if (!project) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'test-runs', label: 'Test Runs' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="mt-1 text-sm text-slate-500 hover:text-slate-300"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-slate-400">{project.description}</p>
            )}
            {project.baseUrl && (
              <p className="mt-1 font-mono text-xs text-tide-400">{project.baseUrl}</p>
            )}
            {(project.tags ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(project.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-3xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-6 py-3.5 text-sm font-medium transition ${
                activeTab === t.id
                  ? 'border-b-2 border-tide-400 text-tide-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'endpoints' && <EndpointsTab project={project} />}
          {activeTab === 'test-runs' && <TestRunsTab project={project} />}
          {activeTab === 'settings' && (
            <SettingsTab project={project} onUpdated={setProject} />
          )}
        </div>
      </div>
    </div>
  );
}
