import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/cn';
import { buttonStyles } from '../ui/buttonStyles';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InlineEditableName } from './InlineEditableName';
import { FlowGroupList } from './FlowGroupList';
import { DraggableFlowItem } from './DraggableFlowItem';
import { FlowDragOverlay } from './FlowDragOverlay';
import type { Project } from '../../types/api';
import type { FlowDefinition, FlowGroup } from '../../types/flow';

interface FlowTestingTabProps {
  project: Project;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' },
  ready: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  archived: { bg: 'bg-slate-400/10 border-slate-400/20', text: 'text-slate-500' },
};

type ViewMode = 'groups' | 'all';

export function FlowTestingTab({ project }: FlowTestingTabProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [groupedFlowIds, setGroupedFlowIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [groups, setGroups] = useState<FlowGroup[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [activeFlowName, setActiveFlowName] = useState<string>('');
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  // DnD sensors — require 8px movement before drag starts to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

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

  const fetchGroupedFlowIds = useCallback(async () => {
    try {
      const ids = await api.getGroupedFlowIds(project.id);
      setGroupedFlowIds(new Set(ids));
    } catch {
      // Silently fail — non-critical
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchFlows();
    void fetchGroupedFlowIds();
  }, [fetchFlows, fetchGroupedFlowIds]);

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
      void fetchGroupedFlowIds();
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        toast.error('Failed to delete flow');
      }
    }
  };

  const handleUpdateFlowName = async (flowId: string, name: string) => {
    try {
      await api.updateFlow(project.id, flowId, { name });
      setFlows((prev) =>
        prev.map((f) => (f.id === flowId ? { ...f, name } : f)),
      );
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to update flow name');
    }
  };

  const handleGroupsChanged = (updatedGroups?: FlowGroup[]) => {
    if (updatedGroups) setGroups(updatedGroups);
    void fetchGroupedFlowIds();
    void fetchFlows();
  };

  // ─── Drag & Drop helpers ──────────────────────────────────────────────

  /** Parse a sortable ID to extract its type and data.
   *  ID formats:
   *   - ungrouped: "ungrouped-{uuid}"
   *   - grouped:   "group-{uuid}-{uuid}"  (group-{groupId}-{flowId})
   *   UUID = 8-4-4-4-12 = 36 chars with hyphens
   */
  const parseDragId = useCallback(
    (id: string): { type: 'ungrouped' | 'grouped'; flowId: string; groupId?: string } => {
      if (id.startsWith('ungrouped-')) {
        return { type: 'ungrouped', flowId: id.substring('ungrouped-'.length) };
      }
      if (id.startsWith('group-')) {
        // "group-" prefix is 6 chars, then groupId (36 chars UUID), then "-", then flowId (36 chars UUID)
        const rest = id.substring(6); // after "group-"
        const groupId = rest.substring(0, 36);
        const flowId = rest.substring(37); // skip the "-" separator
        return { type: 'grouped', flowId, groupId };
      }
      return { type: 'ungrouped', flowId: id };
    },
    [],
  );

  /** Find which group a droppable/sortable element belongs to */
  const findGroupForItem = useCallback(
    (itemId: string): string | null => {
      // Droppable zone ID: "droppable-group-{uuid}" — prefix is 16 chars
      if (itemId.startsWith('droppable-group-')) {
        return itemId.substring('droppable-group-'.length);
      }
      // Sortable item ID: "group-{uuid}-{uuid}"
      if (itemId.startsWith('group-')) {
        const parsed = parseDragId(itemId);
        return parsed.groupId ?? null;
      }
      return null; // ungrouped item
    },
    [parseDragId],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const parsed = parseDragId(String(event.active.id));
      setActiveFlowId(parsed.flowId);
      const flow = flows.find((f) => f.id === parsed.flowId);
      setActiveFlowName(flow?.name || 'Flow');
    },
    [parseDragId, flows],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveFlowId(null);
      setActiveFlowName('');

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const source = parseDragId(activeId);
      const targetGroupId = findGroupForItem(overId);

      // ── Case 1: Ungrouped flow → group ────────────────────────────────
      if (source.type === 'ungrouped' && targetGroupId) {
        try {
          await api.addFlowToGroup(project.id, targetGroupId, source.flowId);
          toast.success('Flow added to group');
          setGroupRefreshKey((k) => k + 1);
          void fetchGroupedFlowIds();
          void fetchFlows();
        } catch (err) {
          if (!isUnauthorizedError(err)) toast.error('Failed to add flow to group');
        }
        return;
      }

      // ── Case 2: Grouped flow → different group ────────────────────────
      if (source.type === 'grouped' && source.groupId && targetGroupId && source.groupId !== targetGroupId) {
        try {
          await api.removeFlowFromGroup(project.id, source.groupId, source.flowId);
          await api.addFlowToGroup(project.id, targetGroupId, source.flowId);
          toast.success('Flow moved to another group');
          setGroupRefreshKey((k) => k + 1);
          void fetchGroupedFlowIds();
          void fetchFlows();
        } catch (err) {
          if (!isUnauthorizedError(err)) toast.error('Failed to move flow between groups');
        }
        return;
      }

      // ── Case 3: Reorder within same group ─────────────────────────────
      if (source.type === 'grouped' && source.groupId && targetGroupId === source.groupId) {
        const group = groups.find((g) => g.id === source.groupId);
        if (!group) return;
        const items = [...(group.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);
        const targetParsed = parseDragId(overId);

        const activeIdx = items.findIndex((i) => i.flowId === source.flowId);
        const overIdx = items.findIndex((i) => i.flowId === targetParsed.flowId);
        if (activeIdx < 0 || overIdx < 0 || activeIdx === overIdx) return;

        // Rearrange and assign new sort orders
        const reordered = [...items];
        const [moved] = reordered.splice(activeIdx, 1);
        reordered.splice(overIdx, 0, moved);

        const reorderPayload = reordered.map((item, i) => ({
          flowId: item.flowId,
          sortOrder: i,
        }));

        try {
          await api.reorderGroupItems(project.id, source.groupId, { items: reorderPayload });
          setGroupRefreshKey((k) => k + 1);
        } catch (err) {
          if (!isUnauthorizedError(err)) toast.error('Failed to reorder');
        }
        return;
      }
    },
    [api, project.id, parseDragId, findGroupForItem, groups, fetchGroupedFlowIds, fetchFlows],
  );

  const ungroupedFlows = flows.filter((f) => !groupedFlowIds.has(f.id));
  const displayFlows = viewMode === 'all' ? flows : ungroupedFlows;

  // Sortable IDs for ungrouped flows
  const ungroupedSortableIds = useMemo(
    () => ungroupedFlows.map((f) => `ungrouped-${f.id}`),
    [ungroupedFlows],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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

      {/* View mode toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
        <button
          type="button"
          onClick={() => setViewMode('groups')}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition',
            viewMode === 'groups'
              ? 'bg-white/10 text-slate-100'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          Groups
        </button>
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition',
            viewMode === 'all'
              ? 'bg-white/10 text-slate-100'
              : 'text-slate-500 hover:text-slate-300',
          )}
        >
          All Flows
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

      {/* Groups section */}
      {viewMode === 'groups' && (
        <FlowGroupList
          project={project}
          ungroupedFlows={ungroupedFlows}
          onGroupsChanged={handleGroupsChanged}
          onGroupsLoaded={setGroups}
          refreshKey={groupRefreshKey}
        />
      )}

      {/* Flows section */}
      {viewMode === 'groups' && ungroupedFlows.length > 0 && (
        <div className="mt-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Ungrouped Flows</h3>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">Loading flows...</div>
      ) : displayFlows.length === 0 ? (
        viewMode === 'all' || ungroupedFlows.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.45)] py-12 text-center">
            <div className="mb-1 text-sm font-medium text-slate-200">
              {viewMode === 'all' ? 'No flows yet' : 'No ungrouped flows'}
            </div>
            <div className="text-xs text-slate-500">
              {viewMode === 'all'
                ? 'Create your first flow to start building visual API test chains.'
                : 'All flows are assigned to groups.'}
            </div>
          </div>
        ) : null
      ) : (
        <SortableContext
          items={viewMode === 'groups' ? ungroupedSortableIds : []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {displayFlows.map((flow) => {
              const badge = STATUS_BADGE[flow.status] || STATUS_BADGE.draft;
              const isUngroupedInGroupView = viewMode === 'groups' && !groupedFlowIds.has(flow.id);

              const card = (
                <div
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.45)] p-3 transition hover:border-white/20 hover:bg-[rgba(var(--bg-800),0.6)]"
                  onClick={() => navigate(`/projects/${project.id}/flows/${flow.id}`)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <InlineEditableName
                        value={flow.name}
                        onSave={(name) => handleUpdateFlowName(flow.id, name)}
                        className="text-sm font-medium text-slate-100"
                      />
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                          badge.bg,
                          badge.text,
                        )}
                      >
                        {flow.status}
                      </span>
                      {groupedFlowIds.has(flow.id) && viewMode === 'all' && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-600">
                          grouped
                        </span>
                      )}
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

              return isUngroupedInGroupView ? (
                <DraggableFlowItem key={flow.id} id={`ungrouped-${flow.id}`}>
                  {card}
                </DraggableFlowItem>
              ) : (
                <div key={flow.id}>{card}</div>
              );
            })}
          </div>
        </SortableContext>
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

    {/* Drag overlay shown while dragging */}
    <DragOverlay dropAnimation={null}>
      {activeFlowId && <FlowDragOverlay flowName={activeFlowName} />}
    </DragOverlay>
    </DndContext>
  );
}
