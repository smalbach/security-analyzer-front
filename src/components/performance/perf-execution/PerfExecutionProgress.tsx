interface PerfExecutionProgressProps {
  phase: string;
  percentage: number;
  message?: string;
}

export function PerfExecutionProgress({ phase, percentage, message }: PerfExecutionProgressProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="capitalize">{phase.replace(/-/g, ' ')}</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-tide-400 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
