import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  VERSION_PREFIX_REGEX,
  buildEndpointTree,
  countNodeEndpoints,
  getAllEndpointIds,
  getDisplayPath,
} from '../../lib/endpointTree';
import type { EndpointTreeNode } from '../../lib/endpointTree';
import type {
  ApiEndpoint,
  DataScope,
  ProjectRole,
  RoleEndpointPermission,
  RoleEndpointPermissionItem,
} from '../../types/api';
import { Button, Select } from '../ui';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  HEAD: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

interface LocalPermission {
  endpointId: string;
  hasAccess: boolean;
  dataScope: DataScope;
}

type AccessState = 'all' | 'none' | 'partial';

// ── Helpers ────────────────────────────────────────────────────────────────

function getGroupAccessState(ids: string[], permissions: LocalPermission[]): AccessState {
  const relevant = permissions.filter((p) => ids.includes(p.endpointId));
  if (relevant.length === 0) return 'none';
  const allOn = relevant.every((p) => p.hasAccess);
  const allOff = relevant.every((p) => !p.hasAccess);
  if (allOn) return 'all';
  if (allOff) return 'none';
  return 'partial';
}

function getGroupDataScope(ids: string[], permissions: LocalPermission[]): DataScope | '' {
  const relevant = permissions.filter((p) => ids.includes(p.endpointId));
  if (relevant.length === 0) return 'all';
  const scopes = new Set(relevant.map((p) => p.dataScope));
  return scopes.size === 1 ? ([...scopes][0] as DataScope) : '';
}

// ── Group checkbox (supports indeterminate) ────────────────────────────────

interface GroupCheckboxProps {
  state: AccessState;
  onChange: (checked: boolean) => void;
}

function GroupCheckbox({ state, onChange }: GroupCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'partial';
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'all'}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
    />
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────

interface RolePermissionsPanelProps {
  projectId: string;
  role: ProjectRole;
  endpoints: ApiEndpoint[];
}

export function RolePermissionsPanel({ projectId, role, endpoints }: RolePermissionsPanelProps) {
  const { api } = useAuth();
  const [permissions, setPermissions] = useState<LocalPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const endpointTree = useMemo(() => buildEndpointTree(endpoints), [endpoints]);

  useEffect(() => {
    setLoading(true);
    api
      .getRolePermissions(projectId, role.id)
      .then((dbPerms: RoleEndpointPermission[]) => {
        const permMap = new Map(dbPerms.map((p) => [p.endpointId, p]));
        setPermissions(
          endpoints.map((ep) => {
            const existing = permMap.get(ep.id);
            return {
              endpointId: ep.id,
              hasAccess: existing?.hasAccess ?? true,
              dataScope: existing?.dataScope ?? 'all',
            };
          }),
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      })
      .finally(() => setLoading(false));
  }, [api, projectId, role.id, endpoints]);

  const updatePermission = (endpointId: string, patch: Partial<LocalPermission>) => {
    setPermissions((prev) => prev.map((p) => (p.endpointId === endpointId ? { ...p, ...patch } : p)));
    setSaved(false);
  };

  const bulkUpdate = (ids: string[], patch: Partial<LocalPermission>) => {
    setPermissions((prev) => prev.map((p) => (ids.includes(p.endpointId) ? { ...p, ...patch } : p)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: RoleEndpointPermissionItem[] = permissions.map((p) => ({
        endpointId: p.endpointId,
        hasAccess: p.hasAccess,
        dataScope: p.dataScope,
      }));
      await api.saveRolePermissions(projectId, role.id, payload);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const renderEndpointRow = (ep: ApiEndpoint, level: number) => {
    const perm = permissions.find((p) => p.endpointId === ep.id);
    if (!perm) return null;
    return (
      <div
        key={ep.id}
        className="flex min-w-0 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
        style={{ marginLeft: `${level * 14 + 14}px` }}
      >
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${
            METHOD_COLORS[ep.method] ?? 'border-white/10 bg-white/5 text-slate-400'
          }`}
        >
          {ep.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
          {getDisplayPath(ep.path)}
        </span>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={perm.hasAccess}
            onChange={(e) => updatePermission(ep.id, { hasAccess: e.target.checked })}
            className="accent-tide-400"
          />
          Access
        </label>
        <Select
          value={perm.dataScope}
          onChange={(e) => updatePermission(ep.id, { dataScope: e.target.value as DataScope })}
          disabled={!perm.hasAccess}
          className="w-28 shrink-0 text-xs"
        >
          <option value="all">All data</option>
          <option value="own">Own only</option>
          <option value="none">No data</option>
        </Select>
      </div>
    );
  };

  const renderNode = (node: EndpointTreeNode, level = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const endpointCount = countNodeEndpoints(node);
    const subtreeIds = getAllEndpointIds(node);
    const accessState = getGroupAccessState(subtreeIds, permissions);
    const groupScope = getGroupDataScope(subtreeIds, permissions);

    return (
      <div key={node.id} className="space-y-1.5" style={{ paddingLeft: `${level * 14}px` }}>
        {/* Group header */}
        <div className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-tide-400/30 hover:bg-white/[0.06]">
          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => toggleNode(node.id)}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-[10px] text-slate-300"
          >
            {isExpanded ? '−' : '+'}
          </button>

          {/* Group label */}
          <button
            type="button"
            onClick={() => toggleNode(node.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="truncate font-mono text-sm text-slate-100">{node.label}</span>
            {VERSION_PREFIX_REGEX.test(node.label) ? (
              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                Version
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {endpointCount}
            </span>
          </button>

          {/* Group access checkbox */}
          <label
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-400"
            onClick={(e) => e.stopPropagation()}
          >
            <GroupCheckbox
              state={accessState}
              onChange={(checked) => bulkUpdate(subtreeIds, { hasAccess: checked })}
            />
            Access
          </label>

          {/* Group data scope select */}
          <Select
            value={groupScope}
            onChange={(e) => {
              if (e.target.value) bulkUpdate(subtreeIds, { dataScope: e.target.value as DataScope });
            }}
            disabled={accessState === 'none'}
            className="w-28 shrink-0 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {groupScope === '' ? <option value="">Mixed</option> : null}
            <option value="all">All data</option>
            <option value="own">Own only</option>
            <option value="none">No data</option>
          </Select>
        </div>

        {isExpanded ? (
          <div className="space-y-1.5">
            {node.endpoints.map((ep) => renderEndpointRow(ep, level))}
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">Loading permissions…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-300">
            Endpoint permissions for{' '}
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: role.color ?? '#6366f1', color: '#fff' }}
            >
              {role.name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure which endpoints this role can access and what data they should see.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved ? <span className="text-xs text-emerald-400">Saved.</span> : null}
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {endpoints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-slate-500">No endpoints in this project yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-0 space-y-1.5">
            {endpointTree.map((node) => renderNode(node))}
          </div>
        </div>
      )}
    </div>
  );
}
