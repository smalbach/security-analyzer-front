import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { isUnauthorizedError } from '../../../lib/api';
import type { ApiEndpoint } from '../../../types/api';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  POST: 'text-sky-400 border-sky-500/20 bg-sky-500/10',
  PUT: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  PATCH: 'text-violet-400 border-violet-500/20 bg-violet-500/10',
  DELETE: 'text-red-400 border-red-500/20 bg-red-500/10',
  OPTIONS: 'text-slate-400 border-white/10 bg-white/5',
  HEAD: 'text-slate-400 border-white/10 bg-white/5',
};

interface EndpointPickerProps {
  projectId: string;
  /** Currently selected URL in the config */
  currentUrl: string;
  currentMethod: string;
  onSelect: (endpoint: ApiEndpoint) => void;
}

export function EndpointPicker({ projectId, currentUrl, currentMethod, onSelect }: EndpointPickerProps) {
  const { api } = useAuth();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fetchEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEndpoints(projectId);
      setEndpoints(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (err) {
      if (!isUnauthorizedError(err)) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    if (open && endpoints.length === 0) {
      void fetchEndpoints();
    }
  }, [open, fetchEndpoints, endpoints.length]);

  const filtered = useMemo(() => {
    if (!search) return endpoints;
    const q = search.toLowerCase();
    return endpoints.filter((ep) =>
      ep.path.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q) || ep.description?.toLowerCase().includes(q),
    );
  }, [endpoints, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs transition hover:bg-white/10"
      >
        {currentUrl ? (
          <span className="flex items-center gap-1.5">
            <span className={`shrink-0 rounded border px-1 py-0 font-mono text-[9px] font-bold ${METHOD_COLOR[currentMethod.toUpperCase()] || 'text-slate-400 border-white/10 bg-white/5'}`}>
              {currentMethod.toUpperCase()}
            </span>
            <span className="truncate font-mono text-slate-200">{currentUrl}</span>
          </span>
        ) : (
          <span className="text-slate-500 italic">Select from existing endpoints...</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.97)] shadow-xl backdrop-blur-xl">
          <div className="sticky top-0 border-b border-white/5 bg-[rgba(var(--bg-900),0.97)] p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints..."
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-[rgb(var(--accent-400))]/40"
            />
          </div>

          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">Loading endpoints...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">
              {endpoints.length === 0 ? 'No endpoints in this project' : 'No matching endpoints'}
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => { onSelect(ep); setOpen(false); setSearch(''); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                >
                  <span className={`shrink-0 rounded border px-1 py-0 font-mono text-[9px] font-bold ${METHOD_COLOR[ep.method] || 'text-slate-400 border-white/10 bg-white/5'}`}>
                    {ep.method}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-slate-200">{ep.path}</span>
                    {ep.description && (
                      <span className="block truncate text-[10px] text-slate-500">{ep.description}</span>
                    )}
                  </span>
                  {ep.requiresAuth && (
                    <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1 py-0 text-[9px] text-amber-400">
                      Auth
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/5 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-slate-500 transition hover:text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
