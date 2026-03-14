import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

interface TestRunsByStatusProps {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#34d399',
  running: '#fbbf24',
  pending: '#60a5fa',
  failed: '#f87171',
};

export function TestRunsByStatus({ data }: TestRunsByStatusProps) {
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

      const entries = Object.entries(data);
      if (entries.length === 0) return;

      const options: ApexCharts.ApexOptions = {
        chart: {
          type: 'donut',
          height: 220,
          background: 'transparent',
          fontFamily: 'inherit',
        },
        series: entries.map(([, v]) => v),
        labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
        colors: entries.map(([k]) => STATUS_COLORS[k] ?? '#6366f1'),
        stroke: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                name: { show: true, fontSize: '12px', color: 'var(--text-secondary)' },
                value: { show: true, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' },
                total: {
                  show: true,
                  label: 'Total',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                },
              },
            },
          },
        },
        legend: {
          position: 'bottom',
          labels: { colors: 'var(--text-secondary)' },
          markers: { size: 6, shape: 'circle' as const },
        },
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

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className="dash-card">
      <h3 className="text-sm font-semibold">Test Runs by Status</h3>
      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">No test runs yet</p>
      ) : (
        <div ref={chartRef} className="mt-2" />
      )}
    </div>
  );
}
