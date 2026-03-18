import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type { GitHubConnection, ScannedEndpoint, SyncResult } from '../../types/api';
import { Button, ConfirmModal } from '../ui';
import { ScanPreviewModal } from './ScanPreviewModal';
import { SyncDiffModal } from './SyncDiffModal';
import { SyncHistoryDrawer } from './SyncHistoryDrawer';

interface GitHubConnectionCardProps {
  projectId: string;
  connection: GitHubConnection;
  onDeleted: () => void;
  onEndpointsChanged: () => void;
}

export function GitHubConnectionCard({
  projectId,
  connection,
  onDeleted,
  onEndpointsChanged,
}: GitHubConnectionCardProps) {
  const { api } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedEndpoint[] | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const repoName = connection.repoUrl.replace(/.*github\.com\//, '').replace(/\.git$/, '');

  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await toastPromise(
        api.scanGitHubRepo(projectId, connection.id),
        { loading: 'Scanning repository...', success: 'Scan complete' },
      );
      setScanResults(results);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setScanning(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await toastPromise(
        api.syncGitHubRepo(projectId, connection.id),
        { loading: 'Syncing with repository...', success: 'Sync complete' },
      );
      setSyncResult(result);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await toastPromise(
        api.deleteGitHubConnection(projectId, connection.id),
        { loading: 'Removing connection...', success: 'Connection removed' },
      );
      onDeleted();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    }
  };

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="truncate text-sm font-medium text-slate-200">{repoName}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {connection.branch}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                connection.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : connection.status === 'scanning'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
              }`}>
                {connection.status}
              </span>
            </div>
            {connection.lastSyncedAt && (
              <p className="mt-1 text-xs text-slate-500">
                Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                {connection.lastCommitSha && (
                  <span className="ml-2 font-mono text-slate-600">
                    {connection.lastCommitSha.slice(0, 7)}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {connection.lastSyncedAt ? (
              <Button variant="secondary" size="sm" onClick={() => void handleSync()} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => void handleScan()} disabled={scanning}>
                {scanning ? 'Scanning...' : 'Scan'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Scan Preview */}
      {scanResults && (
        <ScanPreviewModal
          projectId={projectId}
          connectionId={connection.id}
          endpoints={scanResults}
          onClose={() => setScanResults(null)}
          onImported={() => {
            setScanResults(null);
            onEndpointsChanged();
          }}
        />
      )}

      {/* Sync Diff */}
      {syncResult && (
        <SyncDiffModal
          projectId={projectId}
          connectionId={connection.id}
          syncResult={syncResult}
          onClose={() => setSyncResult(null)}
          onApplied={() => {
            setSyncResult(null);
            onEndpointsChanged();
          }}
        />
      )}

      {/* Sync History */}
      {showHistory && (
        <SyncHistoryDrawer
          projectId={projectId}
          connectionId={connection.id}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Remove GitHub Connection"
          message="This will remove the connection. Imported endpoints will not be deleted."
          confirmLabel="Remove"
          variant="danger"
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
