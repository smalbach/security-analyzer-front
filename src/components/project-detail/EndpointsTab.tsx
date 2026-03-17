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
import { Button, ConfirmModal, EmptyState, Input, PageSizeSelector } from '../ui';
import { ImportFromProjectModal } from './ImportFromProjectModal';

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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

  // ─── Selection store ───────────────────────────────────────────────────────
  const {
    selectedIds,
    setProject,
    toggle,
    toggleGroup,
    selectAll,
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
  const allEndpointIds = useMemo(() => endpoints.map((ep) => ep.id), [endpoints]);

  const handlePageChange = async (page: number) => {
    await fetchEndpoints(page, search);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    void fetchEndpoints(1, search, size);
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
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  // ─── Single endpoint status actions ─────────────────────────────────────────
  const handleArchive = async (endpointId: string) => {
    try {
      await toastPromise(api.archiveEndpoint(project.id, endpointId), {
        loading: 'Archiving endpoint...',
        success: 'Endpoint archived',
      });
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  const handleUnarchive = async (endpointId: string) => {
    try {
      await toastPromise(api.unarchiveEndpoint(project.id, endpointId), {
        loading: 'Unarchiving endpoint...',
        success: 'Endpoint restored to active',
      });
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  const handleDeactivate = async (endpointId: string) => {
    try {
      await toastPromise(api.deactivateEndpoint(project.id, endpointId), {
        loading: 'Deactivating endpoint...',
        success: 'Endpoint deactivated',
      });
      await fetchEndpoints(currentPage, search);
    } catch (error) {
      if (isUnauthorizedError(error)) return;
    }
  };

  const handleActivate = async (endpointId: string) => {
    try {
      await toastPromise(api.activateEndpoint(project.id, endpointId), {
        loading: 'Activating endpoint...',
        success: 'Endpoint activated',
      });
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

  const renderEndpointActions = (endpoint: ApiEndpoint) => {
    const status = endpoint.status ?? 'active';
    return (
      <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
        <Button
          variant="secondary"
          size="xs"
          onClick={() => navigate(`/projects/${project.id}/endpoints/${endpoint.id}`)}
        >
          Edit
        </Button>
        {status === 'active' && (
          <>
            <Button variant="secondary" size="xs" onClick={() => void handleArchive(endpoint.id)}>
              Archive
            </Button>
            <Button variant="secondary" size="xs" onClick={() => void handleDeactivate(endpoint.id)}>
              Deactivate
            </Button>
          </>
        )}
        {status === 'archived' && (
          <Button variant="secondary" size="xs" onClick={() => void handleUnarchive(endpoint.id)}>
            Unarchive
          </Button>
        )}
        {status === 'inactive' && (
          <Button variant="secondary" size="xs" onClick={() => void handleActivate(endpoint.id)}>
            Activate
          </Button>
        )}
        <Button variant="danger" size="xs" onClick={() => void handleDelete(endpoint.id)}>
          Delete
        </Button>
      </div>
    );
  };

  const renderNode = (node: EndpointTreeNode, level = 0) => {
    const hasChildren = node.children.length > 0;
    const hasEndpoints = node.endpoints.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const endpointCount = countNodeEndpoints(node);
    const directEndpointCount = node.endpoints.length;
    const nodeEndpointIds = getAllEndpointIds(node);

    return (
      <div key={node.id} className="space-y-2" style={{ paddingLeft: `${level * 14}px` }}>
        <div className="group flex w-full min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-tide-400/40 hover:bg-white/[0.06]">
          <GroupCheckbox ids={nodeEndpointIds} onToggle={toggleGroup} />
          <button
            type="button"
            onClick={() => toggleNode(node.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-[10px] text-slate-300">
              {hasChildren || hasEndpoints ? (isExpanded ? '-' : '+') : ' '}
            </span>
            <span className="truncate font-mono text-sm text-slate-100">{node.label}</span>
            {VERSION_PREFIX_REGEX.test(node.label) ? (
              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                Version
              </span>
            ) : null}
            <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">
              {directEndpointCount} directos | {endpointCount} total
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {endpointCount}
            </span>
          </button>
        </div>

        {isExpanded ? (
          <div className="space-y-2">
            {node.endpoints.map((endpoint) => {
              const epStatus = endpoint.status ?? 'active';
              return (
                <div key={endpoint.id} className="pl-[14px]">
                  <div
                    className={`group flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      isSelected(endpoint.id)
                        ? 'border-tide-400/40 bg-tide-500/[0.10]'
                        : epStatus === 'archived'
                          ? 'border-amber-500/20 bg-amber-500/[0.05] hover:border-amber-400/40 hover:bg-amber-500/[0.10]'
                          : epStatus === 'inactive'
                            ? 'border-slate-500/20 bg-slate-500/[0.05] hover:border-slate-400/40 hover:bg-slate-500/[0.10]'
                            : 'border-emerald-500/20 bg-emerald-500/[0.07] hover:border-emerald-400/40 hover:bg-emerald-500/[0.12]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(endpoint.id)}
                      onChange={() => toggle(endpoint.id)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 accent-tide-400"
                      aria-label={`Select ${endpoint.method} ${endpoint.path}`}
                    />
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                      Endpoint
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${
                        METHOD_COLOR[endpoint.method] ?? 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${project.id}/endpoints/${endpoint.id}`)}
                      className={`min-w-0 flex-1 truncate text-left font-mono text-sm hover:text-tide-300 ${
                        epStatus === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-200'
                      }`}
                    >
                      {getDisplayPath(endpoint.path)}
                    </button>

                    {/* Status badge */}
                    {(statusFilter === 'all' || epStatus !== 'active') && (
                      <span
                        className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-block ${STATUS_BADGE[epStatus]}`}
                      >
                        {STATUS_LABEL[epStatus]}
                      </span>
                    )}

                    {/* Auth badge */}
                    <span
                      className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-block ${
                        endpoint.requiresAuth
                          ? 'border-sky-400/30 bg-sky-400/10 text-sky-300'
                          : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      }`}
                    >
                      {endpoint.requiresAuth ? 'Auth' : 'Public'}
                    </span>

                    {endpoint.description ? (
                      <span className="hidden max-w-xs truncate text-xs text-slate-500 sm:block">
                        {endpoint.description}
                      </span>
                    ) : null}
                    {renderEndpointActions(endpoint)}
                  </div>
                </div>
              );
            })}
            {node.children.map((childNode) => renderNode(childNode, level + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/projects/${project.id}/endpoints/new`)}>Add Endpoint</Button>
        <Button variant="secondary" onClick={() => setShowImportPanel((current) => !current)}>
          {showImportPanel ? 'Hide import' : 'Import'}
        </Button>
        <Button variant="secondary" onClick={() => setShowImportFromProject(true)}>
          Import from Project
        </Button>
      </div>

      {showImportPanel ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              From File (OpenAPI, Postman, Insomnia, Markdown)
            </p>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="file"
                accept=".yaml,.yml,.json,.md,.txt"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="flex-1 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border file:border-white/10 file:bg-white/5 file:px-3 file:py-1 file:text-xs file:text-slate-300"
              />
              <Button onClick={() => void handleImportFile()} disabled={!importFile || importing}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">From cURL</p>
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                value={curlInput}
                onChange={(event) => setCurlInput(event.target.value)}
                placeholder='curl -X POST https://api.example.com/users -H "..."'
                className="min-w-0 flex-1 font-mono"
              />
              <Button onClick={() => void handleImportCurl()} disabled={!curlInput.trim() || curlImporting}>
                {curlImporting ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleStatusFilterChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search endpoints by path or description..."
        className="bg-white/5"
      />

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading...</div>
      ) : endpoints.length === 0 ? (
        <EmptyState
          title={search ? 'No endpoints match your search.' : statusFilter !== 'active' ? `No ${statusFilter === 'all' ? '' : statusFilter + ' '}endpoints.` : 'No endpoints yet.'}
          description={
            search
              ? 'Try a different search term.'
              : statusFilter !== 'active'
                ? 'There are no endpoints with this status.'
                : 'Add a new endpoint or import an existing collection to start testing.'
          }
          action={
            search ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {/* ── Header bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Endpoint explorer</p>
              <p className="text-sm text-slate-200">
                {pagination
                  ? `Showing ${endpoints.length} of ${pagination.total} endpoints`
                  : `${endpoints.length} endpoints`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <span className="rounded-full border border-tide-400/30 bg-tide-500/10 px-3 py-1 text-xs font-semibold text-tide-300">
                    {selectedIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    Clear
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => selectAll(allEndpointIds)}
                className="text-xs text-slate-400 transition hover:text-slate-200"
              >
                Select all on page
              </button>
              <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} disabled={loading} />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {pagination?.total ?? endpoints.length} total
              </span>
            </div>
          </div>

          {/* ── Bulk actions bar ── */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-tide-400/20 bg-tide-500/[0.06] px-4 py-2.5">
              <span className="mr-1 text-xs font-semibold text-tide-300">
                {selectedIds.size} selected:
              </span>
              {(statusFilter === 'active' || statusFilter === 'all') && (
                <>
                  <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('archived')}>
                    Archive
                  </Button>
                  <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('inactive')}>
                    Deactivate
                  </Button>
                </>
              )}
              {(statusFilter === 'archived' || statusFilter === 'inactive' || statusFilter === 'all') && (
                <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('active')}>
                  Activate
                </Button>
              )}
              {statusFilter === 'archived' && (
                <Button variant="secondary" size="xs" onClick={() => void handleBulkStatus('active')}>
                  Unarchive
                </Button>
              )}
              <Button variant="danger" size="xs" onClick={() => setConfirmBulkDelete(true)}>
                Delete
              </Button>
            </div>
          )}

          {endpointTree.map((node) => renderNode(node))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => void handlePageChange(currentPage - 1)}
              >
                ← Prev
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - currentPage) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => void handlePageChange(p)}
                      disabled={loading}
                      className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-tide-500 text-white'
                          : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= pagination.totalPages || loading}
                onClick={() => void handlePageChange(currentPage + 1)}
              >
                Next →
              </Button>
            </div>
          ) : null}
        </div>
      )}
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
    </div>
  );
}
