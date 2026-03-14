import type { TestEndpointResponse } from '../../types/api';
import { TabBar } from '../ui';
import { RESPONSE_TABS, getResponseStatusColor } from './constants';
import type { ResponseTab } from './types';

interface EndpointResponsePanelProps {
  sending: boolean;
  response: TestEndpointResponse | null;
  responseTab: ResponseTab;
  scriptLogs: string[];
  scriptError?: string;
  onResponseTabChange: (tab: ResponseTab) => void;
}

export function EndpointResponsePanel({
  sending,
  response,
  responseTab,
  scriptLogs,
  scriptError,
  onResponseTabChange,
}: EndpointResponsePanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-slate-300">Response</span>
        {response ? (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${getResponseStatusColor(response.statusCode)}`}
            >
              {response.statusCode}
            </span>
            <span className="text-xs text-slate-500">{response.durationMs}ms</span>
          </div>
        ) : null}
      </div>

      {sending ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-tide-400 border-t-transparent" />
        </div>
      ) : null}

      {!sending && !response ? (
        <div className="py-20 text-center text-sm text-slate-600">
          Send a request to see the response here.
        </div>
      ) : null}

      {!sending && response ? (
        <div className="p-4">
          <TabBar
            tabs={RESPONSE_TABS}
            activeTab={responseTab}
            onChange={onResponseTabChange}
            variant="pill"
            className="mb-3"
          />

          {responseTab === 'body' ? (
            <pre className="max-h-80 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-xs text-slate-200">
              {typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}
            </pre>
          ) : null}

          {responseTab === 'headers' ? (
            <div className="space-y-1 font-mono text-xs">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="shrink-0 text-tide-400">{key}:</span>
                  <span className="break-all text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {responseTab === 'console' ? (
            <div className="max-h-80 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-xs">
              {scriptError && (
                <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-400">
                  Script Error: {scriptError}
                </div>
              )}
              {scriptLogs.length === 0 && !scriptError ? (
                <p className="text-slate-600">No console output. Use log() in your scripts to see output here.</p>
              ) : (
                scriptLogs.map((line, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="mr-2 text-slate-600">{`>`}</span>
                    {line}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
