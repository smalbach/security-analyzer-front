import { useEffect, useRef } from 'react';
import type ApexCharts from 'apexcharts';

interface SecurityScoreChartProps {
  score: number;
  totalPassed: number;
  totalFailed: number;
}

export function SecurityScoreChart({ score, totalPassed, totalFailed }: SecurityScoreChartProps) {
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
          type: 'donut',
          height: 300,
          background: 'transparent',
          fontFamily: 'inherit',
        },
        series: [totalPassed, totalFailed],
        labels: ['Passed', 'Failed'],
        colors: ['#10b981', '#f43f5e'],
        stroke: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: '72%',
              labels: {
                show: true,
                name: { show: true, fontSize: '14px', color: 'var(--text-secondary)' },
                value: { show: true, fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' },
                total: {
                  show: true,
                  label: 'Score',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  formatter: () => `${score}%`,
                },
              },
            },
          },
        },
        legend: { show: false },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val: number) => `${val} checks` },
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
  }, [score, totalPassed, totalFailed]);

  const level = score >= 80 ? 'SECURE' : score >= 50 ? 'MODERATE' : 'AT RISK';
  const levelColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="dash-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Security Score Overview</h3>
      </div>
      <div ref={chartRef} className="mt-2" />
      <div className={`mt-2 flex items-center justify-center gap-2 text-xs font-semibold ${levelColor}`}>
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
        </svg>
        {level}
      </div>
    </div>
  );
}
