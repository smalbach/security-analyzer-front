import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { CopyButton } from '../../ui/CopyButton';
import type { FlowNodeRequestSnapshot, FlowNodeResponseData } from '../../../types/flow';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  POST: 'text-sky-400 border-sky-500/20 bg-sky-500/10',
  PUT: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  PATCH: 'text-orange-400 border-orange-500/20 bg-orange-500/10',
  DELETE: 'text-red-400 border-red-500/20 bg-red-500/10',
};

function statusColor(code: number): string {
  if (code < 300) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  if (code < 400) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
  return 'text-red-400 border-red-500/20 bg-red-500/10';
}

function formatJson(data: unknown): string {
  if (data === null || data === undefined) return '(empty)';
  if (typeof data === 'string') {
    try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
  }
  return JSON.stringify(data, null, 2);
}

function CollapsibleSection({ title, children, defaultOpen = false, count }: { title: string; children: React.ReactNode; defaultOpen?: boolean; count?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500 hover:text-slate-300 transition"
      >
        <span className="text-[9px]">{open ? '▾' : '▸'}</span>
        <span>{title}</span>
        {count != null && <span className="text-slate-600 font-normal normal-case">({count})</span>}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

function JsonBlock({ data, maxLines = 60 }: { data: unknown; maxLines?: number }) {
  const [showAll, setShowAll] = useState(false);
  const formatted = formatJson(data);
  const lines = formatted.split('\n');
  const truncated = !showAll && lines.length > maxLines;
  const display = truncated ? lines.slice(0, maxLines).join('\n') + '\n...' : formatted;

  return (
    <div className="relative group">
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={formatted} />
      </div>
      <pre className="max-h-[400px] overflow-auto rounded bg-black/30 px-2.5 py-2 text-[10px] text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
        {display}
      </pre>
      {truncated && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 text-[10px] text-sky-400 hover:text-sky-300 transition"
        >
          Show all ({lines.length} lines)
        </button>
      )}
    </div>
  );
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const headersText = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
  return (
    <div className="relative group rounded bg-black/20 overflow-hidden">
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton text={headersText} />
      </div>
      <table className="w-full text-[10px]">
        <tbody>
          {Object.entries(headers).map(([key, value]) => (
            <tr key={key} className="border-b border-white/[0.03] last:border-0">
              <td className="px-2 py-1 font-mono text-sky-400 whitespace-nowrap align-top w-[1%]">{key}</td>
              <td className="px-2 py-1 font-mono text-slate-400 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ReportRequestResponseProps {
  request: FlowNodeRequestSnapshot | null;
  response: FlowNodeResponseData | null;
}

export function ReportRequestResponse({ request, response }: ReportRequestResponseProps) {
  const [tab, setTab] = useState<'request' | 'response'>(response ? 'response' : 'request');

  if (!request && !response) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">HTTP Request / Response</div>
      <div className="rounded-lg border border-white/5 bg-white/[0.02]">
        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {request && (
            <button
              type="button"
              onClick={() => setTab('request')}
              className={cn(
                'px-3 py-1.5 text-[10px] font-medium transition',
                tab === 'request' ? 'text-slate-200 border-b-2 border-sky-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              Request
            </button>
          )}
          {response && (
            <button
              type="button"
              onClick={() => setTab('response')}
              className={cn(
                'px-3 py-1.5 text-[10px] font-medium transition',
                tab === 'response' ? 'text-slate-200 border-b-2 border-sky-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              Response
              {response.statusCode && (
                <span className={cn('ml-1.5 rounded border px-1 py-0.5 text-[9px] font-bold', statusColor(response.statusCode))}>
                  {response.statusCode}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {tab === 'request' && request && (
            <>
              {/* Method + URL */}
              <div className="flex items-start gap-2">
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold shrink-0', METHOD_COLORS[request.method] || 'text-slate-400')}>
                  {request.method}
                </span>
                <span className="flex-1 text-[11px] text-slate-200 font-mono break-all leading-relaxed">{request.url}</span>
                <CopyButton text={request.url} className="shrink-0" />
              </div>

              {/* Headers — open by default */}
              {request.headers && Object.keys(request.headers).length > 0 && (
                <CollapsibleSection title="Headers" count={Object.keys(request.headers).length} defaultOpen>
                  <HeadersTable headers={request.headers} />
                </CollapsibleSection>
              )}

              {/* Query params */}
              {request.queryParams && Object.keys(request.queryParams).length > 0 && (
                <CollapsibleSection title="Query Parameters" count={Object.keys(request.queryParams).length} defaultOpen>
                  <div className="rounded bg-black/20 overflow-hidden">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {Object.entries(request.queryParams).map(([key, value]) => (
                          <tr key={key} className="border-b border-white/[0.03] last:border-0">
                            <td className="px-2 py-1 font-mono text-emerald-400 whitespace-nowrap align-top w-[1%]">{key}</td>
                            <td className="px-2 py-1 font-mono text-slate-400 break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {/* Body */}
              {request.body != null && (
                <CollapsibleSection title="Request Body" defaultOpen>
                  <JsonBlock data={request.body} />
                </CollapsibleSection>
              )}

              {/* No body indicator */}
              {request.body == null && (
                <div className="text-[10px] text-slate-600 italic">No request body</div>
              )}
            </>
          )}

          {tab === 'response' && response && (
            <>
              {/* Status + Time */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Status:</span>
                  <span className={cn('rounded border px-2 py-0.5 text-[11px] font-bold', statusColor(response.statusCode))}>
                    {response.statusCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Response time:</span>
                  <span className="text-[11px] font-mono text-slate-300">{response.responseTimeMs}ms</span>
                </div>
                {response.dnsTimeMs != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-600">DNS:</span>
                    <span className="text-[10px] font-mono text-slate-400">{response.dnsTimeMs}ms</span>
                  </div>
                )}
                {response.tlsTimeMs != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-600">TLS:</span>
                    <span className="text-[10px] font-mono text-slate-400">{response.tlsTimeMs}ms</span>
                  </div>
                )}
                {response.downloadTimeMs != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-600">Download:</span>
                    <span className="text-[10px] font-mono text-slate-400">{response.downloadTimeMs}ms</span>
                  </div>
                )}
              </div>

              {/* Headers — open by default */}
              {response.headers && Object.keys(response.headers).length > 0 && (
                <CollapsibleSection title="Response Headers" count={Object.keys(response.headers).length} defaultOpen>
                  <HeadersTable headers={response.headers} />
                </CollapsibleSection>
              )}

              {/* Body — always visible */}
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Response Body</div>
                <JsonBlock data={response.body} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
