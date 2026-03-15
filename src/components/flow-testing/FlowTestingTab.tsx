import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/cn';
import { buttonStyles } from '../ui/buttonStyles';
import { HelpTooltip } from '../ui/HelpTooltip';
import type { Project } from '../../types/api';
import type { FlowDefinition } from '../../types/flow';

interface FlowTestingTabProps {
  project: Project;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' },
  ready: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  archived: { bg: 'bg-slate-400/10 border-slate-400/20', text: 'text-slate-500' },
};

export function FlowTestingTab({ project }: FlowTestingTabProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    try {
      const data = await api.getFlows(project.id);
      setFlows(data);
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to load flows');
      }
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchFlows();
  }, [fetchFlows]);

  const handleCreate = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const flow = await api.createFlow(project.id, { name: newFlowName.trim() });
      setShowCreate(false);
      setNewFlowName('');
      navigate(`/projects/${project.id}/flows/${flow.id}`);
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to create flow');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (flowId: string) => {
    try {
      await api.duplicateFlow(project.id, flowId);
      toast.success('Flow duplicated');
      void fetchFlows();
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to duplicate flow');
      }
    }
  };

  const handleDelete = async (flowId: string) => {
    try {
      await api.deleteFlow(project.id, flowId);
      setConfirmDelete(null);
      toast.success('Flow deleted');
      void fetchFlows();
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to delete flow');
      }
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Flow Testing</h2>
            <HelpTooltip
              content="Build visual E2E API test flows with chained requests, assertions, script logic, data-driven testing, and real-time execution monitoring."
              position="right"
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Build visual E2E API test flows with chained requests, assertions, and data-driven testing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={buttonStyles({ variant: 'primary', size: 'sm' })}
        >
          + New Flow
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.45)] p-3">
          <input
            type="text"
            value={newFlowName}
            onChange={(e) => setNewFlowName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Flow name..."
            autoFocus
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newFlowName.trim()}
            className={buttonStyles({ variant: 'primary', size: 'xs' })}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewFlowName(''); }}
            className={buttonStyles({ variant: 'ghost', size: 'xs' })}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Flow list */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">Loading flows...</div>
      ) : flows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.45)] py-12 text-center">
          <div className="mb-1 text-sm font-medium text-slate-200">No flows yet</div>
          <div className="text-xs text-slate-500">
            Create your first flow to start building visual API test chains.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => {
            const badge = STATUS_BADGE[flow.status] || STATUS_BADGE.draft;
            return (
              <div
                key={flow.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.45)] p-3 transition hover:border-white/20 hover:bg-[rgba(var(--bg-800),0.6)]"
                onClick={() => navigate(`/projects/${project.id}/flows/${flow.id}`)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{flow.name}</span>
                    <span
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                        badge.bg,
                        badge.text,
                      )}
                    >
                      {flow.status}
                    </span>
                  </div>
                  {flow.description && (
                    <div className="mt-0.5 truncate text-xs text-slate-500">{flow.description}</div>
                  )}
                  <div className="mt-1 text-[10px] text-slate-600">
                    Updated {new Date(flow.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(flow.id)}
                    className={buttonStyles({ variant: 'ghost', size: 'xs' })}
                    title="Duplicate"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(flow.id)}
                    className={buttonStyles({ variant: 'danger', size: 'xs' })}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.97)] p-4 shadow-2xl">
            <p className="mb-3 text-sm font-medium text-slate-100">
              Delete this flow? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className={buttonStyles({ variant: 'ghost', size: 'xs' })}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className={buttonStyles({ variant: 'danger', size: 'xs' })}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
