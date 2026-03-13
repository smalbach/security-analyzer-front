import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { ApiEndpoint, DataScope, EndpointRoleAccess } from '../../types/api';
import { Button, Modal, Select } from '../ui';

interface EndpointRoleAccessModalProps {
  projectId: string;
  endpoint: ApiEndpoint;
  onClose: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export function EndpointRoleAccessModal({ projectId, endpoint, onClose }: EndpointRoleAccessModalProps) {
  const { api } = useAuth();
  const [items, setItems] = useState<EndpointRoleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getEndpointRoleAccess(projectId, endpoint.id)
      .then(setItems)
      .catch((err: unknown) => {
        if (isUnauthorizedError(err)) return;
        setError(err instanceof Error ? err.message : 'Failed to load role access');
      })
      .finally(() => setLoading(false));
  }, [api, projectId, endpoint.id]);

  const update = (roleId: string, patch: Partial<EndpointRoleAccess>) => {
    setItems((prev) => prev.map((item) => (item.roleId === roleId ? { ...item, ...patch } : item)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateEndpointRoleAccess(
        projectId,
        endpoint.id,
        items.map(({ roleId, hasAccess, dataScope }) => ({ roleId, hasAccess, dataScope })),
      );
      setSaved(true);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Role access"
      description={
        <span className="flex items-center gap-2 font-mono text-xs">
          <span
            className={`rounded-md border px-2 py-0.5 font-bold ${METHOD_COLORS[endpoint.method] ?? 'border-white/10 bg-white/5 text-slate-400'}`}
          >
            {endpoint.method}
          </span>
          <span className="text-slate-300">{endpoint.path}</span>
        </span>
      }
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          {saved ? <span className="text-xs text-emerald-400">Saved.</span> : null}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-slate-400">No roles configured for this project.</p>
          <p className="mt-1 text-xs text-slate-500">
            Go to the <strong className="text-slate-300">Roles</strong> tab to add roles first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <p className="text-xs text-slate-500">
            Define which roles can access this endpoint and what data they can see.
            When a role has no access and still receives HTTP 200 during a test run, it will be flagged as a <strong className="text-red-400">CRITICAL</strong> security finding.
          </p>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Has Access</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Data Scope</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.roleId} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color ?? '#6366f1' }}
                        />
                        <span className="font-medium text-slate-200">{item.roleName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={item.hasAccess}
                          onChange={(e) => update(item.roleId, { hasAccess: e.target.checked })}
                          className="accent-tide-400"
                        />
                        {item.hasAccess ? (
                          <span className="text-emerald-400">Allowed</span>
                        ) : (
                          <span className="text-red-400">Denied</span>
                        )}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.dataScope}
                        onChange={(e) => update(item.roleId, { dataScope: e.target.value as DataScope })}
                        disabled={!item.hasAccess}
                        className="w-32 text-xs"
                      >
                        <option value="all">All data</option>
                        <option value="own">Own only</option>
                        <option value="none">No data</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
