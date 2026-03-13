import type { HttpMethod } from '../../types/api';
import type { EndpointEditorTab, ResponseTab } from './types';

export const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

export const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-sky-400',
  PUT: 'text-amber-400',
  PATCH: 'text-violet-400',
  DELETE: 'text-red-400',
  OPTIONS: 'text-slate-400',
  HEAD: 'text-slate-400',
};

export const REQUEST_TABS: { id: EndpointEditorTab; label: string }[] = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'auth', label: 'Auth' },
  { id: 'access', label: 'Access Control' },
  { id: 'security', label: 'Security Rules' },
];

export const RESPONSE_TABS: { id: ResponseTab; label: string }[] = [
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers' },
];

export function getResponseStatusColor(code: number) {
  if (code < 300) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (code < 400) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  if (code < 500) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-red-400 bg-red-500/10 border-red-500/30';
}
