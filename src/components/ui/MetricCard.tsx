import { cn } from '../../lib/cn';

interface MetricCardProps {
  label: string;
  value: number | string;
  valueClassName?: string;
  className?: string;
}

export function MetricCard({ label, value, valueClassName, className }: MetricCardProps) {
  return (
    <div className={cn('metric-card', className)}>
      <p className="metric-label">{label}</p>
      <p className={cn('metric-value', valueClassName)}>{value}</p>
    </div>
  );
}
