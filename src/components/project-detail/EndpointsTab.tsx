import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { ApiEndpoint, Project } from '../../types/api';
import { Button, EmptyState, Input } from '../ui';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  POST: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  OPTIONS: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  HEAD: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

interface EndpointsTabProps {
  project: Project;
}

interface EndpointTreeNode {
  id: string;
  label: string;
  fullPath: string;
  children: EndpointTreeNode[];
  endpoints: ApiEndpoint[];
}

const VERSION_PREFIX_REGEX = /^v\d+$/i;

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizePathSegments(rawPath: string): string[] {
  return rawPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => decodePathSegment(segment));
}

function getPathTreeSegments(endpointPath: string): string[] {
  const segments = normalizePathSegments(endpointPath);

  if (segments.length === 0) {
    return ['(root)'];
  }

  if (segments.length >= 2 && VERSION_PREFIX_REGEX.test(segments[0])) {
    const [, resource, ...rest] = segments;
    return [resource, segments[0].toLowerCase(), ...rest];
  }

  return segments;
}

function getDisplayPath(endpointPath: string): string {
  const segments = normalizePathSegments(endpointPath);
  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`;
}

function buildEndpointTree(endpoints: ApiEndpoint[]): EndpointTreeNode[] {
  type MutableNode = {
    id: string;
    label: string;
    fullPath: string;
    children: Map<string, MutableNode>;
    endpoints: ApiEndpoint[];
  };

  const root = new Map<string, MutableNode>();

  for (const endpoint of endpoints) {
    const treeSegments = getPathTreeSegments(endpoint.path);

    let parent = root;
    let currentPath = '';
    let currentNode: MutableNode | null = null;

    for (let index = 0; index < treeSegments.length; index += 1) {
      const segment = treeSegments[index];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const key = `${index}:${segment}`;
      const existing = parent.get(key);

      if (existing) {
        currentNode = existing;
        parent = existing.children;
        continue;
      }

      const created: MutableNode = {
        id: currentPath,
        label: segment,
        fullPath: currentPath,
        children: new Map<string, MutableNode>(),
        endpoints: [],
      };

      parent.set(key, created);
      currentNode = created;
      parent = created.children;
    }

    if (currentNode) {
      currentNode.endpoints.push(endpoint);
    }
  }

  const toImmutable = (nodes: Map<string, MutableNode>): EndpointTreeNode[] =>
    Array.from(nodes.values())
      .map((node) => ({
        id: node.id,
        label: node.label,
        fullPath: node.fullPath,
        children: toImmutable(node.children),
        endpoints: [...node.endpoints].sort((a, b) => {
          const methodCompare = a.method.localeCompare(b.method);
          return methodCompare !== 0 ? methodCompare : a.path.localeCompare(b.path);
        }),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return toImmutable(root);
}

function countNodeEndpoints(node: EndpointTreeNode): number {
  return node.endpoints.length + node.children.reduce((total, child) => total + countNodeEndpoints(child), 0);
}

export function EndpointsTab({ project }: EndpointsTabProps) {
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchEndpoints = useCallback(async () => {
    try {
      const response = await api.getEndpoints(project.id);
      setEndpoints(response);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }
      // Keep the current list if fetching fails.
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchEndpoints();
  }, [fetchEndpoints]);

  const endpointTree = useMemo(() => buildEndpointTree(endpoints), [endpoints]);

  const handleImportFile = async () => {
    if (!importFile) {
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      const result = await api.importEndpointsFromFile(project.id, importFile);
      setEndpoints((previous) => [...previous, ...result.endpoints]);
      setImportFile(null);
      setShowImportPanel(false);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCurl = async () => {
    if (!curlInput.trim()) {
      return;
    }

    setCurlImporting(true);
    setImportError('');

    try {
      const endpoint = await api.importEndpointsFromCurl(project.id, curlInput.trim());
      setEndpoints((previous) => [...previous, endpoint]);
      setCurlInput('');
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }
      setImportError(error instanceof Error ? error.message : 'cURL import failed');
    } finally {
      setCurlImporting(false);
    }
  };

  const handleDelete = async (endpointId: string) => {
    if (!confirm('Delete this endpoint?')) {
      return;
    }

    try {
      await api.deleteEndpoint(project.id, endpointId);
      setEndpoints((previous) => previous.filter((endpoint) => endpoint.id !== endpointId));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }
      // Keep the list unchanged if deletion fails.
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
    const directEndpointCount = node.endpoints.length;

    return (
      <div key={node.id} className="space-y-2" style={{ paddingLeft: `${level * 14}px` }}>
        <button
          type="button"
          onClick={() => toggleNode(node.id)}
          className="group flex w-full min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-tide-400/40 hover:bg-white/[0.06]"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-[10px] text-slate-300">
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

        {isExpanded ? (
          <div className="space-y-2">
            {node.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="pl-[14px]">
                <div className="group flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-tide-400/30">
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
                    className="min-w-0 flex-1 truncate text-left font-mono text-sm text-slate-200 hover:text-tide-300"
                  >
                    {getDisplayPath(endpoint.path)}
                  </button>
                  {endpoint.description ? (
                    <span className="hidden max-w-xs truncate text-xs text-slate-500 sm:block">
                      {endpoint.description}
                    </span>
                  ) : null}
                  <div className="flex w-[116px] items-center justify-end gap-1.5 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => navigate(`/projects/${project.id}/endpoints/${endpoint.id}`)}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => void handleDelete(endpoint.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
      </div>

      {showImportPanel ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          {importError ? <p className="text-xs text-red-400">{importError}</p> : null}

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

      {loading ? (
        <div className="py-10 text-center text-slate-500">Loading...</div>
      ) : endpoints.length === 0 ? (
        <EmptyState
          title="No endpoints yet."
          description="Add a new endpoint or import an existing collection to start testing."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Endpoint explorer</p>
              <p className="text-sm text-slate-200">Rutas agrupadas por recurso y version.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
              {endpoints.length} endpoints
            </span>
          </div>
          {endpointTree.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
}
