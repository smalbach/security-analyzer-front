import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { ReportRequestResponse } from './ReportRequestResponse';
import type { FlowNodeStatus, FlowNodeExecution, FlowCanvasNodeData, FlowAssertionResult, FlowSchemaValidationResult, ErrorSource } from '../../../types/flow';

// ── Status visual maps ──────────────────────────────────────────────────────
const STATUS_DOT: Record<FlowNodeStatus, string> = {
  pending: 'bg-slate-500',
  running: 'bg-sky-500 animate-pulse',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  skipped: 'bg-slate-400',
  retrying: 'bg-orange-500 animate-pulse',
};

const STATUS_TEXT: Record<FlowNodeStatus, string> = {
  pending: 'text-slate-500',
  running: 'text-sky-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  skipped: 'text-slate-400',
  retrying: 'text-orange-400',
};

const STATUS_BG: Record<FlowNodeStatus, string> = {
  pending: 'border-slate-500/10 bg-slate-500/[0.02]',
  running: 'border-sky-500/10 bg-sky-500/[0.02]',
  success: 'border-emerald-500/10 bg-emerald-500/[0.02]',
  warning: 'border-amber-500/10 bg-amber-500/[0.02]',
  error: 'border-red-500/10 bg-red-500/[0.03]',
  skipped: 'border-slate-500/10 bg-slate-500/[0.02]',
  retrying: 'border-orange-500/10 bg-orange-500/[0.02]',
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-sky-400 bg-sky-500/10',
  PUT: 'text-amber-400 bg-amber-500/10',
  PATCH: 'text-orange-400 bg-orange-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

const ERROR_SOURCE_LABELS: Record<ErrorSource, string> = {
  network: 'Network Error',
  auth: 'Auth Error',
  target_api_4xx: 'API Error 4xx',
  target_api_5xx: 'API Error 5xx',
  config: 'Config Error',
  script: 'Script Error',
  assertion: 'Assertion Failed',
  unknown: 'Error',
};

const ERROR_SOURCE_COLORS: Record<ErrorSource, string> = {
  network: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  auth: 'border-red-500/20 bg-red-500/10 text-red-400',
  target_api_4xx: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  target_api_5xx: 'border-red-500/20 bg-red-500/10 text-red-400',
  config: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  script: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  assertion: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  unknown: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
};

function statusCodeColor(code: number): string {
  if (code < 300) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  if (code < 400) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
  return 'text-red-400 border-red-500/20 bg-red-500/10';
}

// ── Error remediation hints ─────────────────────────────────────────────────
function getErrorHint(error: string, nodeType: string): string | null {
  const e = error.toLowerCase();

  if (e.includes('econnrefused') || e.includes('enotfound') || e.includes('network'))
    return 'Check that the target server is running and the URL is correct. If using localhost, ensure the service is up.';
  if (e.includes('timeout'))
    return 'The request took too long. Check the server health or increase the timeout in retry config.';
  if (e.includes('certificate') || e.includes('ssl') || e.includes('tls'))
    return 'SSL/TLS certificate issue. The server may use a self-signed certificate. Check the URL scheme (http vs https).';
  if (e.includes('token') && (e.includes('not found') || e.includes('extract') || e.includes('undefined')))
    return 'Token extraction failed. Verify the "Token Path" field matches the actual response structure (e.g. "data.token" or "accessToken").';
  if (e.includes('401') || e.includes('unauthorized'))
    return 'Authentication failed. Check your credentials, or ensure the Auth node runs before this request.';
  if (e.includes('403') || e.includes('forbidden'))
    return 'Permission denied. The authenticated user may not have access to this resource.';
  if (e.includes('404') || e.includes('not found'))
    return 'Resource not found. Verify the URL path and any dynamic segments.';
  if (e.includes('400') || e.includes('bad request'))
    return 'Bad request. Check the request body, headers, and query parameters.';
  if (e.includes('500') || e.includes('internal server'))
    return 'Server error. This is a backend issue — check the server logs.';
  if (e.includes('422') || e.includes('unprocessable'))
    return 'Validation error from the server. Check that the request body matches the expected schema.';
  if (e.includes('script') && e.includes('timeout'))
    return 'Script exceeded 5s timeout. Simplify the script logic or remove infinite loops.';
  if (e.includes('referenceerror') || e.includes('is not defined'))
    return 'Variable not defined in script. Available APIs: flow.variables, flow.environment, flow.response, flow.test(), flow.expect().';
  if (e.includes('syntaxerror'))
    return 'JavaScript syntax error in the script. Check for missing brackets, semicolons, or typos.';
  if (e.includes('typeerror'))
    return 'Type error in script. A value is null/undefined when you expected an object. Add null checks.';
  if (nodeType === 'condition' && (e.includes('expression') || e.includes('resolve')))
    return 'Condition expression could not be evaluated. Check that upstream nodes provide the expected data.';
  if (nodeType === 'loop' && (e.includes('array') || e.includes('iterate')))
    return 'Loop source did not resolve to an array. Verify the source expression points to an array.';
  if (e.includes('assertion'))
    return 'One or more assertions failed. Expand to see details.';

  return null;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function AssertionResultsList({ results }: { results: FlowAssertionResult[] }) {
  const passed = results.filter((a) => a.passed);
  const failed = results.filter((a) => !a.passed);

  return (
    <div className="mt-1.5 space-y-0.5">
      {failed.map((a, i) => (
        <div key={`f-${i}`} className="flex items-start gap-1.5 text-[10px]">
          <span className="mt-0.5 text-red-400">✗</span>
          <div className="min-w-0">
            <span className="text-red-300">{a.name}: </span>
            <span className="text-slate-400">{a.message}</span>
          </div>
        </div>
      ))}
      {passed.length > 0 && (
        <div className="text-[10px] text-emerald-400/60">
          ✓ {passed.length} assertion{passed.length > 1 ? 's' : ''} passed
        </div>
      )}
    </div>
  );
}

function SchemaIssues({ schema }: { schema: FlowSchemaValidationResult }) {
  const issues = [
    ...(schema.errors || []).map((e) => ({ type: 'error' as const, path: e.path, message: e.message })),
    ...(schema.warnings || []).map((w) => ({ type: 'warning' as const, path: w.path, message: w.message })),
  ];
  if (issues.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5">
      <div className="text-[10px] font-medium text-slate-400">Schema Validation:</div>
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px]">
          <span className={cn('mt-0.5', issue.type === 'error' ? 'text-red-400' : 'text-amber-400')}>
            {issue.type === 'error' ? '✗' : '⚠'}
          </span>
          <span className="text-slate-400">
            <span className="font-mono text-slate-500">{issue.path}</span>{' '}
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function ExecutionTimeline() {
  const { nodes, nodeStatuses, nodeResults, nodeRetries, executionSummary, showExecutionTimeline, setShowExecutionTimeline, selectNode, setConfigPanelTab } =
    useFlowBuilderStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (!showExecutionTimeline) return null;

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const hasAnyResults = Object.keys(nodeResults).length > 0 || Object.keys(nodeStatuses).length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[420px] overflow-y-auto border-t border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.97)] backdrop-blur-xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[rgba(var(--bg-900),0.98)] px-3 py-1.5">
        <span className="text-xs font-semibold text-slate-200">Execution Timeline</span>
        <div className="flex items-center gap-3">
          {executionSummary && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-emerald-400">{executionSummary.passed} passed</span>
              {executionSummary.warnings > 0 && (
                <span className="text-amber-400">{executionSummary.warnings} warn</span>
              )}
              {executionSummary.errors > 0 && (
                <span className="text-red-400">{executionSummary.errors} failed</span>
              )}
              <span className="text-slate-500">{executionSummary.durationMs}ms total</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowExecutionTimeline(false)}
            className="flex h-5 w-5 items-center justify-center rounded-md text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            ×
          </button>
        </div>
      </div>

      {/* Node rows */}
      <div className="space-y-1 p-2">
        {!hasAnyResults && (
          <div className="py-4 text-center text-xs text-slate-500">
            Waiting for execution events…
          </div>
        )}
        {nodes.map((node) => {
          const status = nodeStatuses[node.id];
          const result: FlowNodeExecution | undefined = nodeResults[node.id];
          const retry = nodeRetries[node.id];
          if (!status) return null;

          const nodeData = node.data as unknown as FlowCanvasNodeData;
          const isExpanded = expandedNodes.has(node.id);
          const hasDetails = result && (
            result.error || result.assertionResults?.length || result.schemaValidation ||
            result.scriptOutput || result.requestSnapshot || result.responseData
          );
          const errorHint = result?.error ? getErrorHint(result.error, nodeData.nodeType) : null;
          const errorSource = result?.errorSource as ErrorSource | undefined;

          return (
            <div
              key={node.id}
              className={cn(
                'rounded-lg border transition',
                STATUS_BG[status],
              )}
            >
              {/* Row header — always visible */}
              <button
                type="button"
                onClick={() => hasDetails ? toggleExpand(node.id) : selectNode(node.id)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs"
              >
                <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', STATUS_DOT[status])} />
                <span className="min-w-[80px] max-w-[120px] font-medium text-slate-200 truncate">
                  {nodeData.label}
                </span>
                <span className={cn('shrink-0 text-[10px] font-semibold uppercase', STATUS_TEXT[status])}>
                  {status}
                </span>

                {/* HTTP method + URL for request/auth nodes */}
                {(nodeData.nodeType === 'auth' || nodeData.nodeType === 'request') && result?.requestSnapshot && (
                  <span className="flex items-center gap-1 text-[10px] min-w-0">
                    <span className={cn('rounded px-1 py-0.5 font-bold text-[9px] shrink-0', METHOD_COLORS[result.requestSnapshot.method] || 'text-slate-400 bg-slate-500/10')}>
                      {result.requestSnapshot.method}
                    </span>
                    <span className="text-slate-500 truncate max-w-[180px] font-mono text-[9px]">
                      {result.requestSnapshot.url}
                    </span>
                  </span>
                )}

                {/* Response status code */}
                {result?.responseData?.statusCode != null && (
                  <span className={cn('rounded border px-1 py-0.5 text-[9px] font-bold shrink-0', statusCodeColor(result.responseData.statusCode))}>
                    {result.responseData.statusCode}
                  </span>
                )}

                {/* Duration */}
                {result?.durationMs != null && (
                  <span className="text-[10px] text-slate-500 shrink-0">{result.durationMs}ms</span>
                )}

                {/* Retry badge */}
                {retry && (
                  <span className="rounded border border-orange-500/20 bg-orange-500/10 px-1 text-[10px] text-orange-400 shrink-0">
                    retry {retry.attempt}/{retry.maxRetries}
                  </span>
                )}

                {/* Error source badge */}
                {errorSource && status === 'error' && !isExpanded && (
                  <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-medium shrink-0', ERROR_SOURCE_COLORS[errorSource])}>
                    {ERROR_SOURCE_LABELS[errorSource]}
                  </span>
                )}

                {/* Assertion summary */}
                {result?.assertionResults && result.assertionResults.length > 0 && !errorSource && (
                  <span className="text-[10px] shrink-0">
                    <span className="text-emerald-400">{result.assertionResults.filter((a) => a.passed).length}</span>
                    <span className="text-slate-600">/</span>
                    <span className={result.assertionResults.some((a) => !a.passed) ? 'text-red-400' : 'text-emerald-400'}>
                      {result.assertionResults.length}
                    </span>
                    <span className="text-slate-600 ml-0.5">assertions</span>
                  </span>
                )}

                {/* Compact error preview */}
                {result?.error && !isExpanded && !errorSource && (
                  <span className="ml-auto max-w-[200px] truncate text-[10px] text-red-400" title={result.error}>
                    {result.error}
                  </span>
                )}

                {/* Expand indicator */}
                {hasDetails && (
                  <span className="ml-auto text-[10px] text-slate-600 shrink-0">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && result && (
                <div className="border-t border-white/5 px-3 py-2 text-[11px] space-y-2">
                  {/* Error source badge (expanded) */}
                  {errorSource && result.error && (
                    <div className="flex items-start gap-2">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0', ERROR_SOURCE_COLORS[errorSource])}>
                        {ERROR_SOURCE_LABELS[errorSource]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="rounded-lg bg-red-500/[0.06] px-2 py-1.5 text-[11px] text-red-300 font-mono whitespace-pre-wrap break-all">
                          {result.error}
                        </div>
                        {errorHint && (
                          <div className="mt-1.5 rounded-lg bg-sky-500/[0.06] border border-sky-500/10 px-2 py-1.5 text-[11px] text-sky-300">
                            {errorHint}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { selectNode(node.id); setConfigPanelTab('config'); }}
                          className="mt-1.5 text-[10px] text-sky-400 hover:text-sky-300 hover:underline transition"
                        >
                          Open node config →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error without source (fallback) */}
                  {!errorSource && result.error && (
                    <div>
                      <div className="mb-0.5 font-medium text-red-400">Error:</div>
                      <div className="rounded-lg bg-red-500/[0.06] px-2 py-1.5 text-[11px] text-red-300 font-mono whitespace-pre-wrap break-all">
                        {result.error}
                      </div>
                      {errorHint && (
                        <div className="mt-1.5 rounded-lg bg-sky-500/[0.06] border border-sky-500/10 px-2 py-1.5 text-[11px] text-sky-300">
                          {errorHint}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { selectNode(node.id); setConfigPanelTab('config'); }}
                        className="mt-1.5 text-[10px] text-sky-400 hover:text-sky-300 hover:underline transition"
                      >
                        Open node config →
                      </button>
                    </div>
                  )}

                  {/* Skipped reason */}
                  {status === 'skipped' && result.error && (
                    <div className="text-slate-400">
                      <span className="font-medium text-slate-300">Reason:</span> {result.error}
                    </div>
                  )}

                  {/* Request / Response viewer */}
                  {(result.requestSnapshot || result.responseData) && (
                    <ReportRequestResponse
                      request={result.requestSnapshot}
                      response={result.responseData}
                    />
                  )}

                  {/* Assertion results */}
                  {result.assertionResults && result.assertionResults.length > 0 && (
                    <AssertionResultsList results={result.assertionResults} />
                  )}

                  {/* Schema validation */}
                  {result.schemaValidation && (
                    <SchemaIssues schema={result.schemaValidation} />
                  )}

                  {/* Script output */}
                  {result.scriptOutput && result.scriptOutput.logs.length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-medium text-slate-400">Script logs:</div>
                      <pre className="mt-0.5 max-h-[80px] overflow-auto rounded bg-black/30 px-2 py-1 text-[10px] text-slate-400 font-mono">
                        {result.scriptOutput.logs.join('\n')}
                      </pre>
                    </div>
                  )}

                  {/* Extracted values */}
                  {result.extractedValues && Object.keys(result.extractedValues).length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-medium text-slate-400">Extracted values:</div>
                      <div className="mt-0.5 space-y-0.5">
                        {Object.entries(result.extractedValues).map(([key, val]) => (
                          <div key={key} className="flex gap-1 text-[10px]">
                            <span className="font-mono text-emerald-400">{key}:</span>
                            <span className="text-slate-400 truncate">{JSON.stringify(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
