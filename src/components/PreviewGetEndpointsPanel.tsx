import { useMemo, useState } from 'react';
import type { PreviewEndpoint } from '../types/api';
import {
  DEFAULT_PREVIEW_GET_FILTERS,
  filterPreviewGetEndpoints,
  type PreviewGetFilters,
} from '../utils/preview-utils';

type PreviewGetEndpointsPanelProps = {
  endpoints: PreviewEndpoint[];
};

export function PreviewGetEndpointsPanel({ endpoints }: PreviewGetEndpointsPanelProps) {
  const [filters, setFilters] = useState<PreviewGetFilters>(DEFAULT_PREVIEW_GET_FILTERS);

  const filteredEndpoints = useMemo(
    () => filterPreviewGetEndpoints(endpoints, filters),
    [endpoints, filters],
  );

  const applyFilterPatch = (patch: Partial<PreviewGetFilters>): void => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-lg font-semibold">GET Endpoints in preview</h3>
        <p className="text-xs text-slate-300">
          Showing {filteredEndpoints.length} of {endpoints.length}
        </p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span>Search</span>
          <input
            className="field"
            placeholder="URL or endpointId"
            value={filters.search}
            onChange={(event) => applyFilterPatch({ search: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Authentication</span>
          <select
            className="field"
            value={filters.auth}
            onChange={(event) => applyFilterPatch({ auth: event.target.value as PreviewGetFilters['auth'] })}
          >
            <option value="all">All</option>
            <option value="requires_auth">Requires auth</option>
            <option value="public">Public</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Body</span>
          <select
            className="field"
            value={filters.body}
            onChange={(event) => applyFilterPatch({ body: event.target.value as PreviewGetFilters['body'] })}
          >
            <option value="all">All</option>
            <option value="has_body">With body</option>
            <option value="no_body">No body</option>
          </select>
        </label>
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {filteredEndpoints.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slatewave-900/65 p-4 text-sm text-slate-300">
            No GET endpoints match the current filters.
          </p>
        ) : (
          filteredEndpoints.map((endpoint) => (
            <article key={endpoint.endpointId} className="rounded-xl border border-white/10 bg-slatewave-900/65 p-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-tide-300">GET</p>
              <p className="mt-1 break-all text-sm text-slate-100">{endpoint.url}</p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="badge">
                  <strong>endpointId:</strong> {endpoint.endpointId}
                </span>
                <span className="badge">{endpoint.requiresAuth ? 'Requires auth' : 'Public'}</span>
                <span className="badge">{endpoint.hasBody ? 'Has body' : 'No body'}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
