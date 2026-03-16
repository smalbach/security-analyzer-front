import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast } from '../../lib/toast';
import { buttonStyles } from '../ui/buttonStyles';
import { HelpTooltip } from '../ui/HelpTooltip';
import { FlowGroupCard } from './FlowGroupCard';
import { FlowGroupCreateDialog } from './FlowGroupCreateDialog';
import { useFlowGroupExecution } from '../../hooks/useFlowGroupExecution';
import type { Project } from '../../types/api';
import type { FlowGroup, FlowDefinition } from '../../types/flow';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface FlowGroupListProps {
  project: Project;
  ungroupedFlows: FlowDefinition[];
  onGroupsChanged: (groups?: FlowGroup[]) => void;
  /** Notify parent of loaded groups (used for DnD cross-group operations) */
  onGroupsLoaded?: (groups: FlowGroup[]) => void;
  /** Increment to force a re-fetch of groups (e.g. after DnD operations) */
  refreshKey?: number;
}

export function FlowGroupList({ project, ungroupedFlows, onGroupsChanged, onGroupsLoaded, refreshKey }: FlowGroupListProps) {
  const { api } = useAuth();
  const [groups, setGroups] = useState<FlowGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addFlowGroupId, setAddFlowGroupId] = useState<string | null>(null);

  // Group execution tracking (one at a time)
  const [runningGroupId, setRunningGroupId] = useState<string | null>(null);
  const [runningExecId, setRunningExecId] = useState<string | null>(null);

  const groupExec = useFlowGroupExecution({
    baseUrl: API_BASE,
    groupExecutionId: runningExecId,
    enabled: !!runningExecId,
    token: localStorage.getItem('asa_access_token') ?? undefined,
    onCompleted: () => {
      toast.success('Group execution completed');
      setRunningGroupId(null);
      setRunningExecId(null);
      void fetchGroups();
    },
    onFailed: (error) => {
      toast.error(`Group execution failed: ${error}`);
      setRunningGroupId(null);
      setRunningExecId(null);
      void fetchGroups();
    },
  });

  const fetchGroups = useCallback(async () => {
    try {
      const data = await api.getFlowGroups(project.id);
      setGroups(data);
      onGroupsLoaded?.(data);
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to load flow groups');
      }
    } finally {
      setLoading(false);
    }
  }, [api, project.id, onGroupsLoaded]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups, refreshKey]);

  const handleCreate = async (name: string, description?: string) => {
    try {
      await api.createFlowGroup(project.id, { name, description });
      setShowCreate(false);
      toast.success('Group created');
      void fetchGroups();
      onGroupsChanged();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.deleteFlowGroup(project.id, groupId);
      setConfirmDelete(null);
      toast.success('Group deleted');
      void fetchGroups();
      onGroupsChanged();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to delete group');
    }
  };

  const handleUpdateGroupName = async (groupId: string, name: string) => {
    try {
      await api.updateFlowGroup(project.id, groupId, { name });
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, name } : g)),
      );
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to update group name');
    }
  };

  const handleUpdateFlowName = async (flowId: string, name: string) => {
    try {
      await api.updateFlow(project.id, flowId, { name });
      // Refresh groups to update flow names inside
      void fetchGroups();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to update flow name');
    }
  };

  const handleRunGroup = async (groupId: string) => {
    try {
      const exec = await api.startGroupExecution(project.id, groupId);
      setRunningGroupId(groupId);
      setRunningExecId(exec.id);
      groupExec.reset();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to start group execution');
    }
  };

  const handleCancelGroup = async (groupId: string) => {
    if (!runningExecId) return;
    try {
      await api.cancelGroupExecution(project.id, groupId, runningExecId);
      setRunningGroupId(null);
      setRunningExecId(null);
      void fetchGroups();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to cancel execution');
    }
  };

  const handleRemoveFlow = async (groupId: string, flowId: string) => {
    try {
      await api.removeFlowFromGroup(project.id, groupId, flowId);
      void fetchGroups();
      onGroupsChanged();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to remove flow from group');
    }
  };

  const handleMoveFlow = async (groupId: string, flowId: string, direction: 'up' | 'down') => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const items = [...(group.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = items.findIndex((i) => i.flowId === flowId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    // Swap
    const newItems = items.map((item, i) => ({
      flowId: item.flowId,
      sortOrder: i === idx ? items[targetIdx].sortOrder : i === targetIdx ? items[idx].sortOrder : item.sortOrder,
    }));

    try {
      await api.reorderGroupItems(project.id, groupId, { items: newItems });
      void fetchGroups();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to reorder');
    }
  };

  const handleAddFlowToGroup = async (groupId: string, flowId: string) => {
    try {
      await api.addFlowToGroup(project.id, groupId, flowId);
      setAddFlowGroupId(null);
      toast.success('Flow added to group');
      void fetchGroups();
      onGroupsChanged();
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to add flow to group');
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-xs text-slate-500">Loading groups...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Test Groups</h3>
          <HelpTooltip
            content="Group flows into named test suites. Run all flows in a group sequentially with variable inheritance between them."
            position="right"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={buttonStyles({ variant: 'ghost', size: 'xs' })}
        >
          + New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 py-6 text-center">
          <p className="text-xs text-slate-500">No groups yet. Create one to organize your flow tests.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isThisGroupRunning = runningGroupId === group.id && groupExec.isRunning;
            return (
              <div key={group.id}>
                <FlowGroupCard
                  group={group}
                  projectId={project.id}
                  isRunning={isThisGroupRunning}
                  currentFlowIndex={isThisGroupRunning ? groupExec.currentFlowIndex : -1}
                  currentFlowName={isThisGroupRunning ? groupExec.currentFlowName : ''}
                  completedFlows={isThisGroupRunning ? groupExec.completedFlows : 0}
                  totalFlowsRunning={isThisGroupRunning ? groupExec.totalFlows : 0}
                  flowResults={isThisGroupRunning ? groupExec.flowResults : []}
                  onUpdateGroupName={handleUpdateGroupName}
                  onUpdateFlowName={handleUpdateFlowName}
                  onDeleteGroup={(id) => setConfirmDelete(id)}
                  onRunGroup={(id) => void handleRunGroup(id)}
                  onCancelGroup={(id) => void handleCancelGroup(id)}
                  onRemoveFlow={(gid, fid) => void handleRemoveFlow(gid, fid)}
                  onMoveFlow={(gid, fid, dir) => void handleMoveFlow(gid, fid, dir)}
                />
                {/* Add flow dropdown */}
                {addFlowGroupId === group.id ? (
                  <div className="mt-1 flex items-center gap-2 rounded border border-white/10 bg-[rgba(var(--bg-800),0.6)] p-2">
                    <select
                      className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) void handleAddFlowToGroup(group.id, e.target.value);
                      }}
                    >
                      <option value="" disabled>
                        Select a flow to add...
                      </option>
                      {ungroupedFlows.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAddFlowGroupId(null)}
                      className={buttonStyles({ variant: 'ghost', size: 'xs' })}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddFlowGroupId(group.id)}
                    className="mt-1 w-full rounded border border-dashed border-white/10 py-1 text-[10px] text-slate-600 transition hover:border-white/20 hover:text-slate-400"
                  >
                    + Add flow
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <FlowGroupCreateDialog
          onConfirm={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.97)] p-4 shadow-2xl">
            <p className="mb-3 text-sm font-medium text-slate-100">
              Delete this group? Flows inside will not be deleted.
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
                onClick={() => void handleDeleteGroup(confirmDelete)}
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
