import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

interface VulnerabilitiesChartProps {
  data: { rule: string; count: number; severity: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

export function VulnerabilitiesChart({ data }: VulnerabilitiesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const ApexChartsLib = (await import('apexcharts')).default;
      if (cancelled || !chartRef.current) return;

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const options: ApexCharts.ApexOptions = {
        chart: {
          type: 'bar',
          height: 280,
          background: 'transparent',
          fontFamily: 'inherit',
          toolbar: { show: false },
        },
        series: [
          {
            name: 'Occurrences',
            data: data.map((d) => d.count),
          },
        ],
        colors: data.map((d) => SEVERITY_COLORS[d.severity] ?? '#6366f1'),
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            barHeight: '60%',
            distributed: true,
          },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => formatRuleName(d.rule)),
          labels: { style: { colors: 'var(--text-secondary)', fontSize: '11px' } },
        },
        yaxis: {
          labels: { style: { colors: 'var(--text-secondary)', fontSize: '11px' } },
        },
        grid: {
          borderColor: 'rgba(255,255,255,0.06)',
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
        },
        legend: { show: false },
        tooltip: { theme: 'dark' },
      };

      chartInstance.current = new ApexChartsLib(chartRef.current, options);
      await chartInstance.current.render();
    }

    void render();
    return () => {
      cancelled = true;
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [data]);

  return (
    <div className="dash-card">
      <h3 className="text-sm font-semibold">Top Vulnerabilities</h3>
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">No vulnerabilities found yet</p>
      ) : (
        <div ref={chartRef} className="mt-2" />
      )}
    </div>
  );
}

function formatRuleName(rule: string): string {
  return rule
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Bola/g, 'BOLA')
    .replace(/Idor/g, 'IDOR')
    .replace(/Cors/g, 'CORS')
    .replace(/Jwt/g, 'JWT')
    .replace(/Xss/g, 'XSS')
    .replace(/Sql/g, 'SQL');
}
