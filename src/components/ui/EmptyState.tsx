import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('empty-state rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center', className)}>
      <p className="text-base font-medium text-slate-300">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
