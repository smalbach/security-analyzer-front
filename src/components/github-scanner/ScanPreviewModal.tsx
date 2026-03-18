import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type { ScannedEndpoint } from '../../types/api';
import { Button, Modal } from '../ui';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-sky-400 bg-sky-500/10',
  PUT: 'text-amber-400 bg-amber-500/10',
  PATCH: 'text-violet-400 bg-violet-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

interface ScanPreviewModalProps {
  projectId: string;
  connectionId: string;
  endpoints: ScannedEndpoint[];
  onClose: () => void;
  onImported: () => void;
}

export function ScanPreviewModal({
  projectId,
  connectionId,
  endpoints,
  onClose,
  onImported,
}: ScanPreviewModalProps) {
  const { api } = useAuth();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(endpoints.map((_, i) => i)));
  const [importing, setImporting] = useState(false);

  const toggleAll = () => {
    if (selected.size === endpoints.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(endpoints.map((_, i) => i)));
    }
  };

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const handleImport = async () => {
    const toImport = endpoints.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await toastPromise(
        api.importScannedEndpoints(projectId, connectionId, toImport),
        {
          loading: `Importing ${toImport.length} endpoints...`,
          success: 'Endpoints imported!',
        },
      );
      onImported();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      title="Scan Results"
      description={`Found ${endpoints.length} endpoints. Select which ones to import.`}
      size="xl"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">{selected.size} of {endpoints.length} selected</span>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => void handleImport()} disabled={selected.size === 0 || importing}>
              {importing ? 'Importing...' : `Import ${selected.size} Endpoints`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-1">
        {/* Select all */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
          <input
            type="checkbox"
            checked={selected.size === endpoints.length}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-white/20 accent-tide-400"
          />
          <span className="text-sm font-medium text-slate-300">Select All</span>
        </label>

        <div className="max-h-[50vh] divide-y divide-white/5 overflow-y-auto">
          {endpoints.map((ep, i) => (
            <label
              key={ep.sourceKey}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 accent-tide-400"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${METHOD_COLOR[ep.method] ?? 'text-slate-400 bg-slate-500/10'}`}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate font-mono text-sm text-slate-200">{ep.fullPath}</span>
                </div>
                {ep.description && (
                  <p className="mt-0.5 text-xs text-slate-500">{ep.description}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ep.requiresAuth && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      Auth
                    </span>
                  )}
                  {ep.roles.map((role) => (
                    <span key={role} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                      {role}
                    </span>
                  ))}
                  {ep.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-slate-600 font-mono">{ep.sourceFile}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
