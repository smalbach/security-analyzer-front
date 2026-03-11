import type { Severity } from '../../types/api';

export const REPORT_SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-200 border-red-300/40',
  high: 'bg-orange-500/20 text-orange-200 border-orange-300/40',
  medium: 'bg-amber-500/20 text-amber-100 border-amber-300/40',
  low: 'bg-teal-500/20 text-teal-100 border-teal-300/40',
  info: 'bg-slate-500/20 text-slate-100 border-slate-300/40',
};
