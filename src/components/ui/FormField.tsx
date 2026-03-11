import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  hint,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={cn('mb-1 block text-sm text-slate-400', labelClassName)}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
