import { useState } from 'react';
import { cn } from '../../../lib/cn';
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

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-300 transition"
      >
        <span>{open ? '▾' : '▸'}</span> {title}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

function JsonBlock({ data, maxLines = 50 }: { data: unknown; maxLines?: number }) {
  const [showAll, setShowAll] = useState(false);
  const formatted = formatJson(data);
  const lines = formatted.split('\n');
  const truncated = !showAll && lines.length > maxLines;
  const display = truncated ? lines.slice(0, maxLines).join('\n') + '\n...' : formatted;

  return (
    <div>
      <pre className="max-h-[300px] overflow-auto rounded bg-black/30 px-2 py-1.5 text-[10px] text-slate-400 font-mono whitespace-pre-wrap break-all">
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

interface ReportRequestResponseProps {
  request: FlowNodeRequestSnapshot | null;
  response: FlowNodeResponseData | null;
}

export function ReportRequestResponse({ request, response }: ReportRequestResponseProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');

  if (!request && !response) return null;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02]">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {request && (
          <button
            type="button"
            onClick={() => setTab('request')}
            className={cn(
              'px-3 py-1.5 text-[10px] font-medium transition',
              tab === 'request' ? 'text-slate-200 border-b border-sky-400' : 'text-slate-500 hover:text-slate-300',
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
              tab === 'response' ? 'text-slate-200 border-b border-sky-400' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            Response
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-2">
        {tab === 'request' && request && (
          <>
            {/* Method + URL */}
            <div className="flex items-center gap-2">
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', METHOD_COLORS[request.method] || 'text-slate-400')}>
                {request.method}
              </span>
              <span className="text-[11px] text-slate-300 font-mono break-all">{request.url}</span>
            </div>

            {/* Headers */}
            {request.headers && Object.keys(request.headers).length > 0 && (
              <CollapsibleSection title={`Headers (${Object.keys(request.headers).length})`}>
                <div className="space-y-0.5">
                  {Object.entries(request.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-1 text-[10px]">
                      <span className="font-mono text-slate-500">{key}:</span>
                      <span className="font-mono text-slate-400 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Body */}
            {request.body != null && (
              <CollapsibleSection title="Body" defaultOpen>
                <JsonBlock data={request.body} />
              </CollapsibleSection>
            )}

            {/* Query params */}
            {request.queryParams && Object.keys(request.queryParams).length > 0 && (
              <CollapsibleSection title="Query Parameters">
                <div className="space-y-0.5">
                  {Object.entries(request.queryParams).map(([key, value]) => (
                    <div key={key} className="flex gap-1 text-[10px]">
                      <span className="font-mono text-emerald-400">{key}=</span>
                      <span className="font-mono text-slate-400">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        {tab === 'response' && response && (
          <>
            {/* Status + Time */}
            <div className="flex items-center gap-2">
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', statusColor(response.statusCode))}>
                {response.statusCode}
              </span>
              <span className="text-[10px] text-slate-500">{response.responseTimeMs}ms</span>
              {response.dnsTimeMs != null && (
                <span className="text-[10px] text-slate-600">DNS {response.dnsTimeMs}ms</span>
              )}
              {response.tlsTimeMs != null && (
                <span className="text-[10px] text-slate-600">TLS {response.tlsTimeMs}ms</span>
              )}
            </div>

            {/* Headers */}
            {response.headers && Object.keys(response.headers).length > 0 && (
              <CollapsibleSection title={`Headers (${Object.keys(response.headers).length})`}>
                <div className="space-y-0.5">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-1 text-[10px]">
                      <span className="font-mono text-slate-500">{key}:</span>
                      <span className="font-mono text-slate-400 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Body */}
            <CollapsibleSection title="Body" defaultOpen>
              <JsonBlock data={response.body} />
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  );
}
