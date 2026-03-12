import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import {
  VERSION_PREFIX_REGEX,
  buildEndpointTree,
  countNodeEndpoints,
  getAllEndpointIds,
  getDisplayPath,
} from '../../lib/endpointTree';
import type { ApiEndpoint } from '../../types/api';
import type { EndpointTreeNode } from '../../lib/endpointTree';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  HEAD: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

interface EndpointSelectorPanelProps {
  projectId: string;
  onChange: (selectedIds: string[]) => void;
}

type SelectionState = 'none' | 'partial' | 'all';

// ─── Indeterminate checkbox for groups ──────────────────────────────────────
interface GroupCheckboxProps {
  selectionState: SelectionState;
  onToggle: () => void;
}

function GroupCheckbox({ selectionState, onToggle }: GroupCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = selectionState === 'partial';
    }
  }, [selectionState]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={selectionState === 'all'}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
      aria-label="Select group"
    />
  );
}

export function EndpointSelectorPanel({ projectId, onChange }: EndpointSelectorPanelProps) {
  const { api } = useAuth();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // ─── Load endpoints ─────────────────────────────────────────────────────
  const fetchEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getEndpoints(projectId);
      setEndpoints(response);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    void fetchEndpoints();
  }, [fetchEndpoints]);

  const tree = useMemo(() => buildEndpointTree(endpoints), [endpoints]);
  const allIds = useMemo(() => endpoints.map((ep) => ep.id), [endpoints]);

  // ─── Selection helpers ──────────────────────────────────────────────────
  const notifyChange = (next: Set<string>) => {
    onChange([...next]);
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      notifyChange(next);
      return next;
    });
  };

  const toggleGroup = (ids: string[], forceSelect: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (forceSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      notifyChange(next);
      return next;
    });
  };

  const selectAllEndpoints = () => {
    const next = new Set(allIds);
    setSelectedIds(next);
    notifyChange(next);
  };

  const clearAllEndpoints = () => {
    const next = new Set<string>();
    setSelectedIds(next);
    notifyChange(next);
  };

  const getSelectionState = (ids: string[]): SelectionState => {
    if (ids.length === 0) return 'none';
    const count = ids.filter((id) => selectedIds.has(id)).length;
    if (count === 0) return 'none';
    if (count === ids.length) return 'all';
    return 'partial';
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // ─── Render tree node ───────────────────────────────────────────────────
  const renderNode = (node: EndpointTreeNode, level = 0) => {
    const hasChildren = node.children.length > 0;
    const hasEndpoints = node.endpoints.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const endpointCount = countNodeEndpoints(node);
    const nodeIds = getAllEndpointIds(node);
    const state = getSelectionState(nodeIds);

    return (
      <div key={node.id} style={{ paddingLeft: `${level * 12}px` }}>
        {/* Group row */}
        <div className="flex w-full min-w-0 items-center gap-1.5 px-2 py-1.5 transition hover:bg-white/[0.04]">
          <GroupCheckbox
            selectionState={state}
            onToggle={() => toggleGroup(nodeIds, state !== 'all')}
          />

          <button
            type="button"
            onClick={() => toggleNodeExpand(node.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-[9px] text-slate-300">
              {hasChildren || hasEndpoints ? (isExpanded ? '−' : '+') : ' '}
            </span>
            <span className="truncate font-mono text-xs text-slate-200">{node.label}</span>
            {VERSION_PREFIX_REGEX.test(node.label) ? (
              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-sky-300">
                v
              </span>
            ) : null}
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-1.5 py-0 text-[9px] font-semibold text-slate-400">
              {endpointCount}
            </span>
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded ? (
          <div>
            {node.endpoints.map((endpoint) => {
              const selected = selectedIds.has(endpoint.id);
              return (
                <div
                  key={endpoint.id}
                  className={`flex min-w-0 items-center gap-2 rounded px-2 py-1 transition ${
                    selected
                      ? 'bg-tide-500/[0.10]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(endpoint.id)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
                    aria-label={`Select ${endpoint.method} ${endpoint.path}`}
                  />
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0 font-mono text-[9px] font-bold ${
                      METHOD_COLOR[endpoint.method] ?? 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(endpoint.id)}
                    className="min-w-0 flex-1 truncate text-left font-mono text-xs text-slate-300 hover:text-slate-100"
                  >
                    {getDisplayPath(endpoint.path)}
                  </button>
                </div>
              );
            })}
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-500">
        Cargando endpoints...
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-500">
        No hay endpoints en este proyecto.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          <span className={selectedIds.size > 0 ? 'font-semibold text-tide-300' : ''}>
            {selectedIds.size}
          </span>{' '}
          de {endpoints.length} seleccionados
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={selectAllEndpoints}
            className="transition hover:text-slate-200"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={clearAllEndpoints}
            className="transition hover:text-slate-200"
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] py-1">
        {tree.map((node) => renderNode(node))}
      </div>

      {selectedIds.size === 0 ? (
        <p className="text-[11px] text-amber-400/80">
          Selecciona al menos un endpoint para continuar.
        </p>
      ) : null}
    </div>
  );
}
