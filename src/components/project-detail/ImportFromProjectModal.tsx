import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type {
  ApiEndpoint,
  ImportableProject,
  ProjectEnvironment,
} from '../../types/api';
import type { FlowDefinition } from '../../types/flow';
import { Button, Input } from '../ui';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-sky-400',
  PUT: 'text-amber-400',
  PATCH: 'text-violet-400',
  DELETE: 'text-red-400',
};

interface ImportFromProjectModalProps {
  projectId: string;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'select-project' | 'select-resources' | 'confirm';

export function ImportFromProjectModal({
  projectId,
  onClose,
  onImported,
}: ImportFromProjectModalProps) {
  const { api } = useAuth();

  // ─── Step navigation ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('select-project');

  // ─── Step 1: Project selection ────────────────────────────────────────────
  const [projects, setProjects] = useState<ImportableProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ImportableProject | null>(null);

  // ─── Step 2: Resource selection ───────────────────────────────────────────
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const [selectedEndpointIds, setSelectedEndpointIds] = useState<Set<string>>(new Set());
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<string>>(new Set());
  const [selectedEnvIds, setSelectedEnvIds] = useState<Set<string>>(new Set());

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['endpoints', 'flows', 'environments']),
  );

  // ─── Step 3: Import ───────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);

  // ─── Fetch projects ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingProjects(true);
      try {
        const data = await api.getAvailableImportProjects(projectId);
        setProjects(data);
      } catch (err) {
        if (!isUnauthorizedError(err)) { /* ignore */ }
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [api, projectId]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [projects, projectSearch]);

  // ─── Fetch resources when project selected ────────────────────────────────
  const fetchResources = useCallback(
    async (sourceId: string) => {
      setLoadingResources(true);
      try {
        const [ep, fl, env] = await Promise.all([
          api.getImportProjectEndpoints(projectId, sourceId),
          api.getImportProjectFlows(projectId, sourceId),
          api.getImportProjectEnvironments(projectId, sourceId),
        ]);
        setEndpoints(ep);
        setFlows(fl);
        setEnvironments(env);
      } catch (err) {
        if (!isUnauthorizedError(err)) { /* ignore */ }
      } finally {
        setLoadingResources(false);
      }
    },
    [api, projectId],
  );

  const handleSelectProject = (p: ImportableProject) => {
    setSelectedProject(p);
    setSelectedEndpointIds(new Set());
    setSelectedFlowIds(new Set());
    setSelectedEnvIds(new Set());
    setStep('select-resources');
    void fetchResources(p.id);
  };

  // ─── Toggle helpers ───────────────────────────────────────────────────────
  const toggleId = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const toggleAll = (set: Set<string>, ids: string[]): Set<string> => {
    if (ids.every((id) => set.has(id))) return new Set();
    return new Set(ids);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalSelected =
    selectedEndpointIds.size + selectedFlowIds.size + selectedEnvIds.size;

  // ─── Import execution ─────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!selectedProject || totalSelected === 0) return;
    setImporting(true);
    try {
      const result = await toastPromise(
        api.importFromProject(projectId, {
          sourceProjectId: selectedProject.id,
          endpointIds: selectedEndpointIds.size > 0 ? Array.from(selectedEndpointIds) : undefined,
          flowIds: selectedFlowIds.size > 0 ? Array.from(selectedFlowIds) : undefined,
          environmentIds: selectedEnvIds.size > 0 ? Array.from(selectedEnvIds) : undefined,
        }),
        {
          loading: 'Importing resources...',
          success: 'Import completed',
        },
      );
      onImported();
      onClose();
    } catch (err) {
      if (!isUnauthorizedError(err)) { /* ignore */ }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[rgb(var(--bg-900))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Import from Project</h2>
            <p className="text-xs text-slate-400">
              {step === 'select-project' && 'Select a project to import from'}
              {step === 'select-resources' && `Importing from: ${selectedProject?.name}`}
              {step === 'confirm' && 'Review and confirm import'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Step 1: Select Project ── */}
          {step === 'select-project' && (
            <div className="space-y-3">
              <Input
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search projects..."
                className="bg-white/5"
              />
              {loadingProjects ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading projects...</div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  {projects.length === 0
                    ? 'No other projects available'
                    : 'No projects match your search'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProject(p)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-tide-400/40 hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{p.name}</p>
                        {p.description && (
                          <p className="truncate text-xs text-slate-500">{p.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-3 text-[10px] text-slate-400">
                        <span>{p.endpointCount} endpoints</span>
                        <span>{p.flowCount} flows</span>
                        <span>{p.environmentCount} envs</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Select Resources ── */}
          {step === 'select-resources' && (
            <div className="space-y-4">
              {loadingResources ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading resources...
                </div>
              ) : (
                <>
                  {/* Endpoints section */}
                  <ResourceSection
                    title="Endpoints"
                    count={endpoints.length}
                    selectedCount={selectedEndpointIds.size}
                    expanded={expandedSections.has('endpoints')}
                    onToggle={() => toggleSection('endpoints')}
                    onSelectAll={() =>
                      setSelectedEndpointIds(
                        toggleAll(selectedEndpointIds, endpoints.map((e) => e.id)),
                      )
                    }
                  >
                    {endpoints.map((ep) => (
                      <label
                        key={ep.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEndpointIds.has(ep.id)}
                          onChange={() =>
                            setSelectedEndpointIds(toggleId(selectedEndpointIds, ep.id))
                          }
                          className="h-3.5 w-3.5 rounded accent-tide-400"
                        />
                        <span
                          className={`shrink-0 font-mono text-[10px] font-bold ${
                            METHOD_COLOR[ep.method] ?? 'text-slate-400'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="min-w-0 truncate font-mono text-xs text-slate-300">
                          {ep.path}
                        </span>
                      </label>
                    ))}
                  </ResourceSection>

                  {/* Flows section */}
                  <ResourceSection
                    title="Flows"
                    count={flows.length}
                    selectedCount={selectedFlowIds.size}
                    expanded={expandedSections.has('flows')}
                    onToggle={() => toggleSection('flows')}
                    onSelectAll={() =>
                      setSelectedFlowIds(
                        toggleAll(selectedFlowIds, flows.map((f) => f.id)),
                      )
                    }
                  >
                    {flows.map((flow) => (
                      <label
                        key={flow.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFlowIds.has(flow.id)}
                          onChange={() =>
                            setSelectedFlowIds(toggleId(selectedFlowIds, flow.id))
                          }
                          className="h-3.5 w-3.5 rounded accent-tide-400"
                        />
                        <span className="min-w-0 truncate text-xs text-slate-300">
                          {flow.name}
                        </span>
                        {flow.description && (
                          <span className="truncate text-[10px] text-slate-500">
                            {flow.description}
                          </span>
                        )}
                      </label>
                    ))}
                  </ResourceSection>

                  {/* Environments section */}
                  <ResourceSection
                    title="Environments"
                    count={environments.length}
                    selectedCount={selectedEnvIds.size}
                    expanded={expandedSections.has('environments')}
                    onToggle={() => toggleSection('environments')}
                    onSelectAll={() =>
                      setSelectedEnvIds(
                        toggleAll(selectedEnvIds, environments.map((e) => e.id)),
                      )
                    }
                  >
                    {environments.map((env) => (
                      <label
                        key={env.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEnvIds.has(env.id)}
                          onChange={() =>
                            setSelectedEnvIds(toggleId(selectedEnvIds, env.id))
                          }
                          className="h-3.5 w-3.5 rounded accent-tide-400"
                        />
                        <span className="text-xs text-slate-300">{env.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {env.variables?.length ?? 0} variables
                        </span>
                        {env.isActive && (
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0 text-[9px] text-emerald-300">
                            Active
                          </span>
                        )}
                      </label>
                    ))}
                  </ResourceSection>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <div className="text-xs text-slate-400">
            {step === 'select-resources' && totalSelected > 0 && (
              <span>
                {selectedEndpointIds.size > 0 && `${selectedEndpointIds.size} endpoints`}
                {selectedEndpointIds.size > 0 && (selectedFlowIds.size > 0 || selectedEnvIds.size > 0) && ', '}
                {selectedFlowIds.size > 0 && `${selectedFlowIds.size} flows`}
                {selectedFlowIds.size > 0 && selectedEnvIds.size > 0 && ', '}
                {selectedEnvIds.size > 0 && `${selectedEnvIds.size} environments`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {step === 'select-resources' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStep('select-project');
                  setSelectedProject(null);
                }}
              >
                Back
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {step === 'select-resources' && (
              <Button
                size="sm"
                disabled={totalSelected === 0 || importing}
                onClick={() => void handleImport()}
              >
                {importing ? 'Importing...' : `Import (${totalSelected})`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible resource section ─────────────────────────────────────────────

interface ResourceSectionProps {
  title: string;
  count: number;
  selectedCount: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectAll: () => void;
  children: React.ReactNode;
}

function ResourceSection({
  title,
  count,
  selectedCount,
  expanded,
  onToggle,
  onSelectAll,
  children,
}: ResourceSectionProps) {
  if (count === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-[10px] text-slate-400">{expanded ? '▼' : '▶'}</span>
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0 text-[10px] text-slate-400">
            {count}
          </span>
          {selectedCount > 0 && (
            <span className="rounded-full border border-tide-400/30 bg-tide-500/10 px-2 py-0 text-[10px] text-tide-300">
              {selectedCount} selected
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-[10px] text-slate-400 transition hover:text-slate-200"
        >
          {selectedCount === count ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-white/5 px-1 py-1">
          {children}
        </div>
      )}
    </div>
  );
}
