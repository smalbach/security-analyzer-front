import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import {
  VERSION_PREFIX_REGEX,
  buildEndpointTree,
  countNodeEndpoints,
  getAllEndpointIds,
  getDisplayPath,
} from '../../lib/endpointTree';
import type { EndpointTreeNode } from '../../lib/endpointTree';
import { useEndpointSelectionStore } from '../../stores/endpointSelectionStore';
import type { ApiEndpoint, EndpointStatus, PaginatedEndpointsResponse, Project } from '../../types/api';
import { Button, ConfirmModal, EmptyState, Input } from '../ui';
import { ImportFromProjectModal } from './ImportFromProjectModal';
import { ConnectGitHubModal, GitHubConnectionCard } from '../github-scanner';
import type { GitHubConnection } from '../../types/api';
import { EndpointExplorerLayout } from './EndpointExplorerLayout';

const DEFAULT_PAGE_SIZE = 100;

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  HEAD: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const STATUS_BADGE: Record<EndpointStatus, string> = {
  active: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  archived: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  inactive: 'border-slate-400/30 bg-slate-400/10 text-slate-400',
};

const STATUS_LABEL: Record<EndpointStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  inactive: 'Inactive',
};

type StatusFilter = EndpointStatus | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

interface EndpointsTabProps {
  project: Project;
}

// ─── Indeterminate checkbox helper ──────────────────────────────────────────
interface GroupCheckboxProps {
  ids: string[];
  onToggle: (ids: string[], forceSelect: boolean) => void;
}

function GroupCheckbox({ ids, onToggle }: GroupCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const state = useEndpointSelectionStore((s) => s.selectionState(ids));

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'partial';
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'all'}
      onChange={() => onToggle(ids, state !== 'all')}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
      aria-label="Select group"
    />
  );
}

export function EndpointsTab({ project }: EndpointsTabProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [pagination, setPagination] = useState<PaginatedEndpointsResponse['meta'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [curlInput, setCurlInput] = useState('');
  const [curlImporting, setCurlImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showImportFromProject, setShowImportFromProject] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // ─── GitHub Scanner ─────────────────────────────────────────────────────
  const [showConnectGitHub, setShowConnectGitHub] = useState(false);
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);

  // ─── Inline editor state ─────────────────────────────────────────────────
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  // ─── Selection store ───────────────────────────────────────────────────────
  const {
    selectedIds,
    setProject,
    toggle,
    toggleGroup,
    clearAll,
    isSelected,
  } = useEndpointSelectionStore();

  const fetchEndpoints = useCallback(async (page: number, searchTerm: string, limit = pageSize, status: StatusFilter = statusFilter) => {
    setLoading(true);
    try {
      const response = await api.getEndpoints(project.id, {
        page,
        limit,
        search: searchTerm || undefined,
        status,
      });
      const result = response as PaginatedEndpointsResponse;
      setEndpoints(result.data);
      setPagination(result.meta);
      setCurrentPage(page);
      setProject(project.id, result.data.map((ep) => ep.id));
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    } finally {
      setLoading(false);
    }
  }, [api, project.id, setProject, pageSize, statusFilter]);

  useEffect(() => {
    void fetchEndpoints(1, '', pageSize, statusFilter);
  }, [fetchEndpoints, statusFilter]);

  // Fetch GitHub connection
  useEffect(() => {
    let cancelled = false;
    api.getGitHubConnections(project.id).then((connections) => {
      if (!cancelled && connections.length > 0) {
        setGithubConnection(connections[0]);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [api, project.id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      void fetchEndpoints(1, searchInput);
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const endpointTree = useMemo(() => buildEndpointTree(endpoints), [endpoints]);

  const handlePageChange = async (page: number) => {
    await fetchEndpoints(page, search);
  };

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    clearAll();
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await toastPromise(api.importEndpointsFromFile(project.id, importFile), {
        loading: 'Importing endpoints...',
        success: 'Endpoints imported successfully',
      });
      setImportFile(null);
      setShowImportPanel(false);
      await fetchEndpoints(1, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    } finally {
      setImporting(false);
    }
  };

  const handleImportCurl = async () => {
    if (!curlInput.trim()) return;
    setCurlImporting(true);
    try {
      await toastPromise(api.importEndpointsFromCurl(project.id, curlInput.trim()), {
        loading: 'Adding endpoint from cURL...',
        success: 'Endpoint added',
      });
      setCurlInput('');
      await fetchEndpoints(1, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    } finally {
      setCurlImporting(false);
    }
  };

  const handleDelete = (endpointId: string) => {
    setConfirmDelete(endpointId);
  };

  const confirmDeleteEndpoint = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    try {
      await toastPromise(api.deleteEndpoint(project.id, id), {
        loading: 'Deleting endpoint...',
        success: 'Endpoint deleted',
      });
      if (selectedEndpointId === id) setSelectedEndpointId(null);
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  // ─── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkStatus = async (status: 'active' | 'archived' | 'inactive') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const labels: Record<string, string> = {
      active: 'Activating',
      archived: 'Archiving',
      inactive: 'Deactivating',
    };
    try {
      await toastPromise(api.bulkUpdateEndpointStatus(project.id, ids, status), {
        loading: `${labels[status]} ${ids.length} endpoints...`,
        success: `${ids.length} endpoints updated`,
      });
      clearAll();
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirmBulkDelete(false);
    try {
      await toastPromise(api.bulkDeleteEndpoints(project.id, ids), {
        loading: `Deleting ${ids.length} endpoints...`,
        success: `${ids.length} endpoints deleted`,
      });
      if (selectedEndpointId && ids.includes(selectedEndpointId)) setSelectedEndpointId(null);
      clearAll();
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: EndpointTreeNode, level = 0) => {
    const hasChildren = node.children.length > 0;
    const hasEndpoints = node.endpoints.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const endpointCount = countNodeEndpoints(node);
    const nodeEndpointIds = getAllEndpointIds(node);

    return (
      <div key={node.id} style={{ paddingLeft: level > 0 ? 12 : 0 }}>
        {/* Folder row */}
        <div
          className="group flex min-w-0 items-center gap-1.5 rounded px-2 py-1 cursor-pointer transition-colors hover:bg-white/[0.06]"
          onClick={() => toggleNode(node.id)}
        >
          <GroupCheckbox ids={nodeEndpointIds} onToggle={toggleGroup} />
          <span className="text-[11px] text-slate-500 w-3 text-center select-none">
            {hasChildren || hasEndpoints ? (isExpanded ? '▾' : '▸') : ' '}
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-amber-400/70">
            {isExpanded
              ? <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v1.25l.005.078A2 2 0 0 1 2 3h10.5a.5.5 0 0 1 .5.5v.5h1a1.5 1.5 0 0 0-1.5-1.5h-4L7.414 1.414A2 2 0 0 0 6 .793H3A1.5 1.5 0 0 0 1.5 2zM2 5a1 1 0 0 0-.993.883L.5 13.5A1.5 1.5 0 0 0 2 15h12a1.5 1.5 0 0 0 1.5-1.5L15 6a1 1 0 0 0-1-1H2z" />
              : <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 4H8L6.854 2.854A2 2 0 0 0 5.44 2.293H1.5z" />
            }
          </svg>
          <span className="truncate font-mono text-xs text-slate-200">{node.label}</span>
          {VERSION_PREFIX_REGEX.test(node.label) && (
            <span className="rounded bg-sky-400/10 px-1 text-[9px] font-bold uppercase text-sky-400">v</span>
          )}
          <span className="ml-auto text-[10px] tabular-nums text-slate-500">{endpointCount}</span>
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {node.endpoints.map((endpoint) => {
              const epStatus = endpoint.status ?? 'active';
              const isActive = selectedEndpointId === endpoint.id;
              return (
                <div
                  key={endpoint.id}
                  className={`group flex min-w-0 items-center gap-1.5 rounded px-2 py-[3px] ml-3 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-tide-500/20 text-white'
                      : 'hover:bg-white/[0.05] text-slate-300'
                  }`}
                  onClick={() => setSelectedEndpointId(endpoint.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(endpoint.id)}
                    onChange={() => toggle(endpoint.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-3 w-3 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
                    aria-label={`Select ${endpoint.method} ${endpoint.path}`}
                  />
                  <span
                    className={`shrink-0 w-[42px] text-center rounded font-mono text-[10px] font-bold leading-[18px] ${
                      METHOD_COLOR[endpoint.method] ?? 'text-slate-400'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate font-mono text-xs ${
                      epStatus === 'inactive' ? 'text-slate-500 line-through' : ''
                    }`}
                  >
                    {getDisplayPath(endpoint.path)}
                  </span>
                  {endpoint.requiresAuth && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-sky-400/60" aria-label="Requires auth">
                      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3.5A1.5 1.5 0 0 0 2 7.5v6A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12.5 6h-1V4.5A3.5 3.5 0 0 0 8 1zm2 5V4.5a2 2 0 1 0-4 0V6h4z" />
                    </svg>
                  )}
                  {(statusFilter === 'all' || epStatus !== 'active') && (
                    <span className={`text-[9px] font-semibold ${STATUS_BADGE[epStatus]}`}>
                      {STATUS_LABEL[epStatus][0]}
                    </span>
                  )}
                  {/* Hover actions */}
                  <div className="hidden items-center gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}/endpoints/${endpoint.id}`)}
                      className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-200"
                      title="Open full page"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 1A1.5 1.5 0 0 0 3 2.5v11A1.5 1.5 0 0 0 4.5 15H12a1 1 0 0 0 1-1V5.5L9.5 2H8v3.5A1.5 1.5 0 0 1 6.5 7H4V2.5A.5.5 0 0 1 4.5 2h1V1h-1zm5 0v3.5a.5.5 0 0 0 .5.5h3.5L9.5 1z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(endpoint.id)}
                      className="rounded p-0.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm-7-3A1.5 1.5 0 0 1 5 1h6a1.5 1.5 0 0 1 1.5 1.5H15v1H1v-1h2.5zM2 5h12l-.94 9.398A2 2 0 0 1 11.07 16H4.93a2 2 0 0 1-1.99-1.602L2 5z" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
            {node.children.map((childNode) => renderNode(childNode, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const listContent = (
    <div className="space-y-2">
      {/* Compact toolbar */}
      <div className="flex items-center gap-1.5">
        <Button size="xs" onClick={() => navigate(`/projects/${project.id}/endpoints/new`)}>+ New</Button>
        <Button variant="secondary" size="xs" onClick={() => setShowImportPanel((c) => !c)}>
          {showImportPanel ? 'Hide' : 'Import'}
        </Button>
        <Button variant="secondary" size="xs" onClick={() => setShowImportFromProject(true)}>
          From Project
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => githubConnection ? undefined : setShowConnectGitHub(true)}
          className={githubConnection ? 'border-emerald-500/30 text-emerald-400' : ''}
        >
          GitHub
        </Button>
        <span className="ml-auto text-[10px] tabular-nums text-slate-500">
          {pagination?.total ?? endpoints.length}
        </span>
      </div>

      {showImportPanel && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".yaml,.yml,.json,.md,.txt"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-[11px] text-slate-400 file:mr-2 file:rounded file:border file:border-white/10 file:bg-white/5 file:px-2 file:py-0.5 file:text-[10px] file:text-slate-300"
            />
            <Button size="xs" onClick={() => void handleImportFile()} disabled={!importFile || importing}>
              {importing ? '...' : 'Go'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={curlInput}
              onChange={(event) => setCurlInput(event.target.value)}
              placeholder="Paste cURL..."
              className="min-w-0 flex-1 font-mono !py-1 !text-[11px]"
            />
            <Button size="xs" onClick={() => void handleImportCurl()} disabled={!curlInput.trim() || curlImporting}>
              {curlImporting ? '...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* GitHub Connection Card */}
      {githubConnection && (
        <GitHubConnectionCard
          projectId={project.id}
          connection={githubConnection}
          onDeleted={() => {
            setGithubConnection(null);
          }}
          onEndpointsChanged={() => void fetchEndpoints(1, search)}
        />
      )}

      {/* Status filter tabs - compact */}
      <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleStatusFilterChange(tab.value)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search - compact */}
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search..."
        className="bg-white/5 !py-1 !text-xs"
      />

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">Loading...</div>
      ) : endpoints.length === 0 ? (
        <EmptyState
          title={search ? 'No matches.' : 'No endpoints yet.'}
          description={search ? 'Try a different search.' : 'Add or import endpoints to begin.'}
          action={
            search ? (
              <Button variant="secondary" size="xs" onClick={() => setSearchInput('')}>
                Clear
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-0">
          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-tide-400/20 bg-tide-500/[0.06] px-2 py-1.5 mb-1">
              <span className="text-[10px] font-semibold text-tide-300">{selectedIds.size} sel</span>
              {(statusFilter === 'active' || statusFilter === 'all') && (
                <>
                  <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('archived')}>Arc</Button>
                  <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('inactive')}>Deact</Button>
                </>
              )}
              {(statusFilter === 'archived' || statusFilter === 'inactive' || statusFilter === 'all') && (
                <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('active')}>Act</Button>
              )}
              <Button variant="danger" size="xs" onClick={() => setConfirmBulkDelete(true)}>Del</Button>
              <button type="button" onClick={clearAll} className="ml-auto text-[10px] text-slate-400 hover:text-white">clear</button>
            </div>
          )}

          {/* File tree */}
          {endpointTree.map((node) => renderNode(node))}

          {/* Compact pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => void handlePageChange(currentPage - 1)}
                className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-white/10 disabled:opacity-30"
              >
                Prev
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => void handlePageChange(p)}
                    disabled={loading}
                    className={`h-5 w-5 rounded text-[10px] font-medium ${
                      p === currentPage ? 'bg-tide-500 text-white' : 'text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                disabled={currentPage >= pagination.totalPages || loading}
                onClick={() => void handlePageChange(currentPage + 1)}
                className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <EndpointExplorerLayout
        projectId={project.id}
        selectedEndpointId={selectedEndpointId}
        onEndpointSaved={() => void fetchEndpoints(currentPage, search)}
        listContent={listContent}
      />
      {confirmDelete ? (
        <ConfirmModal
          title="Delete endpoint"
          message="This endpoint will be permanently deleted. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => void confirmDeleteEndpoint()}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
      {confirmBulkDelete ? (
        <ConfirmModal
          title="Delete selected endpoints"
          message={`${selectedIds.size} endpoints will be permanently deleted. This action cannot be undone.`}
          confirmLabel="Delete all"
          onConfirm={() => void handleBulkDelete()}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      ) : null}
      {showImportFromProject ? (
        <ImportFromProjectModal
          projectId={project.id}
          onClose={() => setShowImportFromProject(false)}
          onImported={() => void fetchEndpoints(1, search)}
        />
      ) : null}
      {showConnectGitHub ? (
        <ConnectGitHubModal
          projectId={project.id}
          onClose={() => setShowConnectGitHub(false)}
          onConnected={(connection) => {
            setGithubConnection(connection);
            setShowConnectGitHub(false);
          }}
        />
      ) : null}
    </>
  );
}
