import type { PerfMetricWindow } from '../../../types/performance';

interface PerfMetricsChartProps {
  windows: PerfMetricWindow[];
}

/**
 * Minimal SVG sparkline chart showing P95 response time and error rate over time.
 * Keeps zero dependencies while being readable in the browser.
 */
export function PerfMetricsChart({ windows }: PerfMetricsChartProps) {
  if (windows.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-slate-500">
        Waiting for data…
      </div>
    );
  }

  const WIDTH = 600;
  const HEIGHT = 120;
  const PADDING = { top: 8, right: 16, bottom: 20, left: 48 };
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  // P95 line
  const p95Values = windows.map((w) => w.p95);
  const maxP95 = Math.max(...p95Values, 1);
  const p95Points = p95Values.map((v, i) => ({
    x: PADDING.left + (i / (windows.length - 1)) * chartW,
    y: PADDING.top + chartH - (v / maxP95) * chartH,
  }));
  const p95Path = p95Points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

  // RPS line (secondary axis, normalise 0–1 against max)
  const rpsValues = windows.map((w) => w.rps);
  const maxRps = Math.max(...rpsValues, 1);
  const rpsPoints = rpsValues.map((v, i) => ({
    x: PADDING.left + (i / (windows.length - 1)) * chartW,
    y: PADDING.top + chartH - (v / maxRps) * chartH,
  }));
  const rpsPath = rpsPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

  // Y axis labels
  const yLabels = [0, 0.5, 1].map((fraction) => ({
    y: PADDING.top + chartH - fraction * chartH,
    label: `${Math.round(maxP95 * fraction)} ms`,
  }));

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="mb-1 flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-tide-400" />P95</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-green-400" />RPS</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ minWidth: 300 }}>
        {/* Grid lines */}
        {yLabels.map((yl) => (
          <g key={yl.y}>
            <line
              x1={PADDING.left} y1={yl.y} x2={WIDTH - PADDING.right} y2={yl.y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
            <text x={PADDING.left - 4} y={yl.y + 4} textAnchor="end" fontSize={9} fill="rgba(148,163,184,0.7)">
              {yl.label}
            </text>
          </g>
        ))}

        {/* P95 line */}
        <path d={p95Path} fill="none" stroke="var(--accent-400, #38bdf8)" strokeWidth={1.5} strokeLinejoin="round" />

        {/* RPS line */}
        <path d={rpsPath} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinejoin="round" />

        {/* X axis */}
        <line
          x1={PADDING.left} y1={PADDING.top + chartH}
          x2={WIDTH - PADDING.right} y2={PADDING.top + chartH}
          stroke="rgba(255,255,255,0.1)" strokeWidth={1}
        />
      </svg>
    </div>
  );
}
