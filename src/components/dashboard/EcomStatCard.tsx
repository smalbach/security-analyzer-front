import { cn } from '../../lib/cn';

interface EcomStatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  className?: string;
}

export function EcomStatCard({ title, value, change, icon, className }: EcomStatCardProps) {
  const isPositive = change >= 0;

  return (
    <div className={cn('dash-card flex items-start justify-between', className)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        <p className="mt-2 flex items-center gap-1 text-xs">
          <span className={cn('flex items-center gap-0.5 font-semibold', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {isPositive ? (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path d="M7 17l5-5 5 5" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path d="M7 7l5 5 5-5" />
              </svg>
            )}
            {Math.abs(change).toFixed(2)}%
          </span>
          <span className="text-slate-500">Since last month</span>
        </p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tide-500/15 text-tide-400">
        {icon}
      </div>
    </div>
  );
}
