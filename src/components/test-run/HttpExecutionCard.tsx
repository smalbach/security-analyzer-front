import { useMemo, useState } from 'react';
import type { HttpTestResult } from '../../types/api';
import { MetricCard, TabBar } from '../ui';
import { HttpDataPreview } from './HttpDataPreview';
import { HttpHeadersList } from './HttpHeadersList';
import {
  formatByteSize,
  getHttpResultSummary,
  getMethodTone,
  getResponseStatusTone,
} from './httpResultUtils';

type HttpExecutionTab = 'overview' | 'request' | 'response';

const HTTP_EXECUTION_TABS: Array<{ id: HttpExecutionTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'request', label: 'Request' },
  { id: 'response', label: 'Response' },
];

interface HttpExecutionCardProps {
  httpResult: HttpTestResult;
  defaultOpen?: boolean;
}

export function HttpExecutionCard({ httpResult, defaultOpen = false }: HttpExecutionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<HttpExecutionTab>('overview');
  const summary = useMemo(() => getHttpResultSummary(httpResult), [httpResult]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] ${getMethodTone(httpResult.method)}`}>
              {httpResult.method}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
              {httpResult.testType?.trim() || 'Default'}
            </span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${getResponseStatusTone(httpResult.statusCode, httpResult.error)}`}>
              {httpResult.statusCode}
            </span>
            <span className="text-xs text-slate-400">{httpResult.responseTime} ms</span>
            {summary.contentType ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                {summary.contentType}
              </span>
            ) : null}
          </div>

          <p className="mt-2 break-all font-mono text-xs text-slate-200">{httpResult.endpoint}</p>
          {httpResult.error ? (
            <p className="mt-2 text-sm text-red-300">{httpResult.error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
          <span>{summary.requestHeaderCount} req headers</span>
          <span>{summary.responseHeaderCount} res headers</span>
          <span>{open ? '^' : 'v'}</span>
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/10 p-4">
          <TabBar
            tabs={HTTP_EXECUTION_TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
          />

          {activeTab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Status" value={httpResult.statusCode} valueClassName={getStatusValueClass(httpResult.statusCode, httpResult.error)} />
                <MetricCard label="Response time" value={`${httpResult.responseTime} ms`} />
                <MetricCard label="Request headers" value={summary.requestHeaderCount} />
                <MetricCard label="Response headers" value={summary.responseHeaderCount} />
                <MetricCard label="Response body" value={summary.responseBody.isEmpty ? 'Empty' : formatByteSize(summary.responseBody.bytes)} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <HttpDataPreview
                  title="Request body"
                  value={httpResult.requestBody}
                  emptyLabel="This execution was sent without request body."
                />
                <HttpDataPreview
                  title="Response body"
                  value={httpResult.responseBody}
                  emptyLabel="The endpoint did not return a response body."
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'request' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Request target</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-200">{httpResult.method} {httpResult.endpoint}</p>
              </div>

              <HttpHeadersList title="Request headers" headers={httpResult.requestHeaders} emptyLabel="No request headers were captured for this execution." />
              <HttpDataPreview
                title="Request body"
                value={httpResult.requestBody}
                emptyLabel="This execution was sent without request body."
              />
            </div>
          ) : null}

          {activeTab === 'response' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${getResponseStatusTone(httpResult.statusCode, httpResult.error)}`}>
                    {httpResult.statusCode}
                  </span>
                  <span className="text-xs text-slate-400">{httpResult.responseTime} ms</span>
                  {summary.contentType ? (
                    <span className="text-xs text-slate-500">{summary.contentType}</span>
                  ) : null}
                </div>
                {httpResult.error ? (
                  <p className="mt-2 text-sm text-red-300">{httpResult.error}</p>
                ) : null}
              </div>

              <HttpHeadersList title="Response headers" headers={httpResult.responseHeaders} emptyLabel="No response headers were returned." />
              <HttpDataPreview
                title="Response body"
                value={httpResult.responseBody}
                emptyLabel="The endpoint did not return a response body."
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getStatusValueClass(statusCode: number, error?: string): string {
  if (error || statusCode >= 500) {
    return 'text-red-300';
  }

  if (statusCode >= 400) {
    return 'text-orange-300';
  }

  if (statusCode >= 300) {
    return 'text-sky-300';
  }

  return 'text-emerald-300';
}
