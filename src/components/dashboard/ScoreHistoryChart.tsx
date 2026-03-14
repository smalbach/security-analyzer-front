import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

interface ScoreHistoryChartProps {
  data: { date: string; score: number; projectName: string }[];
}

export function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
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
          type: 'area',
          height: 300,
          background: 'transparent',
          fontFamily: 'inherit',
          toolbar: { show: false },
        },
        series: [
          {
            name: 'Security Score',
            data: data.map((d) => d.score),
          },
        ],
        colors: ['rgb(var(--accent-400))'],
        fill: {
          type: 'gradient',
          gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
        },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => d.date),
          labels: { style: { colors: 'var(--text-secondary)', fontSize: '11px' }, rotate: -45 },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: 100,
          labels: {
            style: { colors: 'var(--text-secondary)', fontSize: '11px' },
            formatter: (val: number) => `${val}%`,
          },
        },
        grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val: number) => `${val}%` },
          x: {
            formatter: (_val: number | string, opts?: { dataPointIndex?: number }) => {
              const idx = opts?.dataPointIndex;
              const item = idx != null ? data[idx] : undefined;
              return item ? `${item.projectName} — ${item.date}` : '';
            },
          },
        },
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
      <h3 className="text-sm font-semibold">Security Score History</h3>
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">No completed test runs yet</p>
      ) : (
        <div ref={chartRef} className="mt-2" />
      )}
    </div>
  );
}
