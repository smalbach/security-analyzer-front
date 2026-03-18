import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { SyncHistory } from '../../types/api';
import { Button, Modal } from '../ui';

interface SyncHistoryDrawerProps {
  projectId: string;
  connectionId: string;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  failed: 'bg-red-500/10 text-red-400',
};

export function SyncHistoryDrawer({
  projectId,
  connectionId,
  onClose,
}: SyncHistoryDrawerProps) {
  const { api } = useAuth();
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getGitHubSyncHistory(projectId, connectionId);
      setHistory(result);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setLoading(false);
    }
  }, [api, projectId, connectionId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <Modal
      title="Sync History"
      description="Previous synchronization operations"
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">No sync history yet.</div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[entry.status] ?? ''}`}>
                    {entry.status}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {entry.commitSha.slice(0, 7)}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(entry.startedAt).toLocaleString()}
                </span>
              </div>

              {entry.summary && (
                <div className="mt-2 flex gap-4 text-xs">
                  {entry.summary.added > 0 && (
                    <span className="text-emerald-400">+{entry.summary.added} added</span>
                  )}
                  {entry.summary.modified > 0 && (
                    <span className="text-amber-400">{entry.summary.modified} changed</span>
                  )}
                  {entry.summary.removed > 0 && (
                    <span className="text-red-400">-{entry.summary.removed} removed</span>
                  )}
                  {entry.summary.unchanged > 0 && (
                    <span className="text-slate-500">{entry.summary.unchanged} unchanged</span>
                  )}
                </div>
              )}

              {entry.error && (
                <p className="mt-2 text-xs text-red-400">{entry.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
