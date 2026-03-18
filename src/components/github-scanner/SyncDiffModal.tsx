import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type { SyncResult, SyncActionItem } from '../../types/api';
import { Button, Modal } from '../ui';
import { ImpactAnalysisPanel } from './ImpactAnalysisPanel';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-sky-400',
  PUT: 'text-amber-400',
  PATCH: 'text-violet-400',
  DELETE: 'text-red-400',
};

const DIFF_TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  added: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'New' },
  modified: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Changed' },
  removed: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'Removed' },
  unchanged: { bg: 'bg-white/5 border-white/10', text: 'text-slate-500', label: 'Unchanged' },
};

interface SyncDiffModalProps {
  projectId: string;
  connectionId: string;
  syncResult: SyncResult;
  onClose: () => void;
  onApplied: () => void;
}

export function SyncDiffModal({
  projectId,
  connectionId,
  syncResult,
  onClose,
  onApplied,
}: SyncDiffModalProps) {
  const { api } = useAuth();
  const [actions, setActions] = useState<Map<string, 'auto' | 'skip'>>(() => {
    const map = new Map<string, 'auto' | 'skip'>();
    for (const item of syncResult.diff) {
      if (item.type !== 'unchanged') {
        map.set(item.endpointKey, 'auto');
      }
    }
    return map;
  });
  const [applying, setApplying] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [impactEndpointId, setImpactEndpointId] = useState<string | null>(null);

  const changeable = syncResult.diff.filter((d) => d.type !== 'unchanged');
  const autoCount = [...actions.values()].filter((a) => a === 'auto').length;

  const toggleAction = (key: string) => {
    setActions((prev) => {
      const next = new Map(prev);
      next.set(key, next.get(key) === 'auto' ? 'skip' : 'auto');
      return next;
    });
  };

  const handleApply = async () => {
    const syncActions: SyncActionItem[] = [...actions.entries()].map(([endpointKey, action]) => ({
      endpointKey,
      action,
    }));
    setApplying(true);
    try {
      await toastPromise(
        api.applySyncChanges(projectId, connectionId, syncActions),
        { loading: 'Applying changes...', success: 'Changes applied' },
      );
      onApplied();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Modal
        title="Sync Results"
        description={`${syncResult.summary.added} new, ${syncResult.summary.modified} changed, ${syncResult.summary.removed} removed, ${syncResult.summary.unchanged} unchanged`}
        size="xl"
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{autoCount} changes to apply</span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={() => void handleApply()} disabled={autoCount === 0 || applying}>
                {applying ? 'Applying...' : `Apply ${autoCount} Changes`}
              </Button>
            </div>
          </div>
        }
      >
        {changeable.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Everything is up to date. No changes detected.
          </div>
        ) : (
          <div className="space-y-2">
            {changeable.map((item) => {
              const style = DIFF_TYPE_STYLE[item.type];
              const isExpanded = expandedKey === item.endpointKey;
              const action = actions.get(item.endpointKey) ?? 'skip';
              const method = item.scanned?.method ?? item.existing?.method ?? '';
              const path = item.scanned?.fullPath ?? item.existing?.path ?? '';

              return (
                <div key={item.endpointKey} className={`rounded-xl border ${style.bg} overflow-hidden`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Action toggle */}
                    <input
                      type="checkbox"
                      checked={action === 'auto'}
                      onChange={() => toggleAction(item.endpointKey)}
                      className="h-4 w-4 shrink-0 rounded border-white/20 accent-tide-400"
                    />

                    {/* Type badge */}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.text} bg-black/20`}>
                      {style.label}
                    </span>

                    {/* Endpoint info */}
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setExpandedKey(isExpanded ? null : item.endpointKey)}
                    >
                      <span className={`text-xs font-bold ${METHOD_COLOR[method] ?? 'text-slate-400'}`}>
                        {method}
                      </span>
                      <span className="truncate font-mono text-sm text-slate-200">{path}</span>
                    </button>

                    {/* Impact button for modified */}
                    {item.type === 'modified' && item.existing?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setImpactEndpointId(item.existing!.id)}
                      >
                        Impact
                      </Button>
                    )}
                  </div>

                  {/* Expanded: field changes */}
                  {isExpanded && item.fieldChanges && item.fieldChanges.length > 0 && (
                    <div className="border-t border-white/5 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="pb-1.5 font-medium">Field</th>
                            <th className="pb-1.5 font-medium">Old</th>
                            <th className="pb-1.5 font-medium">New</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {item.fieldChanges.map((change) => (
                            <tr key={change.field}>
                              <td className="py-1.5 font-medium text-slate-300">{change.field}</td>
                              <td className="py-1.5 font-mono text-red-400/70">
                                {typeof change.oldValue === 'object'
                                  ? JSON.stringify(change.oldValue, null, 0).slice(0, 80)
                                  : String(change.oldValue ?? '-')}
                              </td>
                              <td className="py-1.5 font-mono text-emerald-400/70">
                                {typeof change.newValue === 'object'
                                  ? JSON.stringify(change.newValue, null, 0).slice(0, 80)
                                  : String(change.newValue ?? '-')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Impact Analysis Panel */}
      {impactEndpointId && (
        <ImpactAnalysisPanel
          projectId={projectId}
          endpointId={impactEndpointId}
          onClose={() => setImpactEndpointId(null)}
        />
      )}
    </>
  );
}
