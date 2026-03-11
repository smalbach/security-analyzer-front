import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import type { AnalysisHistoryItem, PaginatedResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
  running: 'bg-sky-500/20 text-sky-100 border-sky-300/40',
  completed: 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40',
  failed: 'bg-red-500/20 text-red-100 border-red-300/40',
};

const RISK_BADGE: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-200 border-red-300/40',
  High: 'bg-orange-500/20 text-orange-200 border-orange-300/40',
  Medium: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
  Low: 'bg-teal-500/20 text-teal-100 border-teal-300/40',
};

export function AnalysisDashboard() {
  const navigate = useNavigate();
  const client = useMemo(() => new ApiClient(API_BASE_URL), []);

  const [data, setData] = useState<PaginatedResponse<AnalysisHistoryItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await client.getHistory({
        page,
        limit: 15,
        projectName: debouncedSearch || undefined,
        sortBy: 'startedAt',
        sortOrder: 'DESC',
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  }, [client, page, debouncedSearch]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Analysis Dashboard</h1>
            <p className="mt-1 text-sm text-slate-200/85">
              Browse past security analyses and start new ones.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/new')}
          >
            New Analysis
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          className="field max-w-sm"
          placeholder="Search by project name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => void fetchHistory()}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <section className="rounded-3xl border border-white/10 bg-slatewave-900/75 shadow-glass backdrop-blur-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-300">Loading analyses...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg text-slate-300">No analyses found</p>
            <p className="mt-2 text-sm text-slate-400">
              Start a new analysis to see results here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.15em] text-slate-300">
                  <th className="border-b border-white/10 px-4 py-3">Project</th>
                  <th className="border-b border-white/10 px-4 py-3">Status</th>
                  <th className="border-b border-white/10 px-4 py-3">Score</th>
                  <th className="border-b border-white/10 px-4 py-3">Risk</th>
                  <th className="border-b border-white/10 px-4 py-3">Endpoints</th>
                  <th className="border-b border-white/10 px-4 py-3">Checks</th>
                  <th className="border-b border-white/10 px-4 py-3">Crit</th>
                  <th className="border-b border-white/10 px-4 py-3">High</th>
                  <th className="border-b border-white/10 px-4 py-3">Med</th>
                  <th className="border-b border-white/10 px-4 py-3">Low</th>
                  <th className="border-b border-white/10 px-4 py-3">Date</th>
                  <th className="border-b border-white/10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-white/5"
                    onClick={() => navigate(`/analysis/${item.id}`)}
                  >
                    <td className="border-b border-white/5 px-4 py-3 font-medium text-slate-100">
                      {item.projectName || '-'}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                          STATUS_BADGE[item.status] ?? STATUS_BADGE.pending
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 font-mono">
                      {item.securityScore ?? '-'}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3">
                      {item.riskLevel ? (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                            RISK_BADGE[item.riskLevel] ?? ''
                          }`}
                        >
                          {item.riskLevel}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3">{item.totalEndpoints}</td>
                    <td className="border-b border-white/5 px-4 py-3">
                      <span className="text-emerald-300">{item.totalPassed}</span>
                      {' / '}
                      <span className="text-red-300">{item.totalFailed}</span>
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 text-red-300">
                      {item.criticalCount}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 text-orange-300">
                      {item.highCount}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 text-amber-300">
                      {item.mediumCount}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 text-teal-300">
                      {item.lowCount}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3 text-xs text-slate-300">
                      {formatDate(item.startedAt)}
                    </td>
                    <td className="border-b border-white/5 px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg bg-tide-500/20 px-3 py-1 text-xs font-medium text-tide-300 transition-colors hover:bg-tide-500/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/analysis/${item.id}`);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm text-slate-300">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatDate(dateIso?: string | null): string {
  if (!dateIso) return '-';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleString();
}
