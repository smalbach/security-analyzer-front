import type { Severity } from '../../types/api';

export const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-200 border-red-400/40',
  high: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
  medium: 'bg-amber-500/20 text-amber-100 border-amber-400/40',
  low: 'bg-teal-500/20 text-teal-100 border-teal-400/40',
  info: 'bg-slate-500/20 text-slate-300 border-slate-400/40',
};

export const RISK_COLOR: Record<string, string> = {
  Critical: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-amber-400',
  Low: 'text-teal-400',
};
