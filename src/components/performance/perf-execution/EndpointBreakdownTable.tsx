import type { PerfMetricWindow } from '../../../types/performance';

interface AggregatedEndpoint {
  method: string;
  path: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  p95: number;
}

function aggregateEndpoints(windows: PerfMetricWindow[]): AggregatedEndpoint[] {
  const map = new Map<
    string,
    { method: string; path: string; requests: number; errors: number; totalTime: number; p95s: number[] }
  >();

  for (const w of windows) {
    for (const ep of w.endpointBreakdown ?? []) {
      const key = `${ep.method}:${ep.path}`;
      const existing = map.get(key);
      if (existing) {
        existing.requests += ep.requests;
        existing.errors += ep.errors;
        existing.totalTime += ep.avgResponseTime * ep.requests;
        existing.p95s.push(ep.p95);
      } else {
        map.set(key, {
          method: ep.method,
          path: ep.path,
          requests: ep.requests,
          errors: ep.errors,
          totalTime: ep.avgResponseTime * ep.requests,
          p95s: [ep.p95],
        });
      }
    }
  }

  return Array.from(map.values())
    .map((e) => ({
      method: e.method,
      path: e.path,
      requests: e.requests,
      errors: e.errors,
      errorRate: e.requests > 0 ? e.errors / e.requests : 0,
      avgResponseTime: e.requests > 0 ? e.totalTime / e.requests : 0,
      p95: e.p95s.length > 0 ? Math.max(...e.p95s) : 0,
    }))
    .sort((a, b) => b.requests - a.requests);
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-400/10 text-blue-400',
  POST: 'bg-green-400/10 text-green-400',
  PUT: 'bg-yellow-400/10 text-yellow-400',
  PATCH: 'bg-orange-400/10 text-orange-400',
  DELETE: 'bg-red-400/10 text-red-400',
};

interface EndpointBreakdownTableProps {
  windows: PerfMetricWindow[];
}

export function EndpointBreakdownTable({ windows }: EndpointBreakdownTableProps) {
  const endpoints = aggregateEndpoints(windows);

  if (endpoints.length === 0) {
    return <p className="text-xs text-slate-500">No endpoint data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left text-slate-400">
            <th className="pb-2 pr-4">Method</th>
            <th className="pb-2 pr-4">Path</th>
            <th className="pb-2 pr-4 text-right">Requests</th>
            <th className="pb-2 pr-4 text-right">Errors</th>
            <th className="pb-2 pr-4 text-right">Error Rate</th>
            <th className="pb-2 pr-4 text-right">Avg</th>
            <th className="pb-2 text-right">P95</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-2 pr-4">
                <span className={`rounded px-1.5 py-0.5 font-mono font-semibold ${METHOD_COLOR[ep.method.toUpperCase()] ?? 'bg-slate-500/10 text-slate-400'}`}>
                  {ep.method.toUpperCase()}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-slate-300 break-all">{ep.path}</td>
              <td className="py-2 pr-4 text-right text-slate-200">{ep.requests.toLocaleString()}</td>
              <td className="py-2 pr-4 text-right text-slate-200">{ep.errors.toLocaleString()}</td>
              <td className={`py-2 pr-4 text-right font-semibold ${ep.errorRate > 0.01 ? 'text-red-400' : 'text-green-400'}`}>
                {(ep.errorRate * 100).toFixed(1)}%
              </td>
              <td className="py-2 pr-4 text-right text-slate-200">{Math.round(ep.avgResponseTime)} ms</td>
              <td className="py-2 text-right text-slate-200">{Math.round(ep.p95)} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
