import { cn } from '../../../lib/cn';
import { describeNodePurpose, type ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import type { FlowNodeExecution, FlowNodeStatus, FlowAssertionResult, FlowSchemaValidationResult, FlowScriptOutput, ErrorSource } from '../../../types/flow';
import { ReportErrorDiagnosis } from './ReportErrorDiagnosis';
import { ReportRequestResponse } from './ReportRequestResponse';

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

const METHOD_COLORS: Record<string, string> = {
  GET: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  POST: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
  PUT: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  PATCH: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  DELETE: 'border-red-500/20 bg-red-500/10 text-red-400',
};

function statusCodeColor(code: number): string {
  if (code < 300) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  if (code < 400) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
  return 'text-red-400 border-red-500/20 bg-red-500/10';
}

// ── Status visual maps ───────────────────────────────────────────────────
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
  pending: 'border-slate-500/20 bg-slate-500/[0.04]',
  running: 'border-sky-500/20 bg-sky-500/[0.04]',
  success: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  warning: 'border-amber-500/20 bg-amber-500/[0.06]',
  error: 'border-red-500/20 bg-red-500/[0.06]',
  skipped: 'border-slate-500/20 bg-slate-500/[0.04]',
  retrying: 'border-orange-500/20 bg-orange-500/[0.04]',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  auth: 'Auth',
  request: 'Request',
  condition: 'Condition',
  loop: 'Loop',
  merge: 'Merge',
  delay: 'Delay',
  script: 'Script',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function AssertionResultsTable({ results }: { results: FlowAssertionResult[] }) {
  const passed = results.filter((a) => a.passed);
  const failed = results.filter((a) => !a.passed);

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase text-slate-500">
        Assertions ({passed.length} passed, {failed.length} failed)
      </div>
      {failed.length > 0 && (
        <div className="space-y-1.5">
          {failed.map((a, i) => (
            <div key={`f-${i}`} className="rounded-lg border border-red-500/10 bg-red-500/[0.04] px-3 py-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400 shrink-0">✗</span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-red-300">{a.name}</span>
                  {a.message && <p className="text-slate-400 mt-0.5">{a.message}</p>}
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] font-semibold uppercase text-slate-600 mb-0.5">Expected</div>
                      <pre className="rounded bg-black/30 px-2 py-1 text-[10px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
                        {typeof a.expected === 'string' ? a.expected : JSON.stringify(a.expected, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase text-slate-600 mb-0.5">Actual</div>
                      <pre className="rounded bg-black/30 px-2 py-1 text-[10px] font-mono text-red-400 whitespace-pre-wrap break-all">
                        {typeof a.actual === 'string' ? a.actual : JSON.stringify(a.actual, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {passed.length > 0 && (
        <div className="space-y-0.5">
          {passed.map((a, i) => (
            <div key={`p-${i}`} className="flex items-center gap-2 text-[11px] text-emerald-400/70">
              <span className="shrink-0">✓</span>
              <span>{a.name}</span>
              {a.actual != null && (
                <span className="text-slate-500 font-mono text-[10px]">= {typeof a.actual === 'string' ? a.actual : JSON.stringify(a.actual)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaIssuesBlock({ schema }: { schema: FlowSchemaValidationResult }) {
  const issues = [
    ...(schema.errors || []).map((e) => ({ type: 'error' as const, path: e.path, message: e.message })),
    ...(schema.warnings || []).map((w) => ({ type: 'warning' as const, path: w.path, message: w.message })),
  ];
  if (issues.length === 0 && schema.valid) {
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Schema Validation</div>
        <div className="text-[11px] text-emerald-400">✓ Schema is valid</div>
      </div>
    );
  }
  if (issues.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">Schema Validation</div>
      <div className="space-y-0.5">
        {issues.map((issue, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className={cn('mt-0.5 shrink-0', issue.type === 'error' ? 'text-red-400' : 'text-amber-400')}>
              {issue.type === 'error' ? '✗' : '⚠'}
            </span>
            <span className="text-slate-400">
              <span className="font-mono text-slate-500">{issue.path}</span>{' '}
              {issue.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptOutputBlock({ output }: { output: FlowScriptOutput }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">Script Output</div>
      {output.logs.length > 0 && (
        <pre className="max-h-[150px] overflow-auto rounded bg-black/30 px-2 py-1.5 text-[10px] text-slate-400 font-mono whitespace-pre-wrap break-all">
          {output.logs.join('\n')}
        </pre>
      )}
      {output.variables && Object.keys(output.variables).length > 0 && (
        <div className="space-y-0.5 mt-1">
          <div className="text-[10px] text-slate-500">Variables set:</div>
          {Object.entries(output.variables).map(([key, val]) => (
            <div key={key} className="flex gap-1 text-[10px]">
              <span className="font-mono text-emerald-400">{key}:</span>
              <span className="text-slate-400 break-all">{JSON.stringify(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtractedValuesBlock({ values }: { values: Record<string, unknown> }) {
  const entries = Object.entries(values);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">Extracted Values</div>
      <div className="rounded-lg border border-white/5 bg-black/20 p-2 space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-2 text-[11px]">
            <span className="font-mono text-emerald-400 shrink-0">{key}</span>
            <span className="text-slate-600">=</span>
            <span className="text-slate-300 font-mono break-all">{JSON.stringify(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimingBreakdown({ execution }: { execution: FlowNodeExecution }) {
  const resp = execution.responseData;
  if (!resp && !execution.durationMs) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">Timing</div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {execution.durationMs != null && (
          <div>
            <span className="text-slate-500">Total: </span>
            <span className="font-mono text-slate-300">{execution.durationMs}ms</span>
          </div>
        )}
        {resp?.responseTimeMs != null && (
          <div>
            <span className="text-slate-500">Response: </span>
            <span className="font-mono text-slate-300">{resp.responseTimeMs}ms</span>
          </div>
        )}
        {resp?.dnsTimeMs != null && (
          <div>
            <span className="text-slate-500">DNS: </span>
            <span className="font-mono text-slate-300">{resp.dnsTimeMs}ms</span>
          </div>
        )}
        {resp?.tlsTimeMs != null && (
          <div>
            <span className="text-slate-500">TLS: </span>
            <span className="font-mono text-slate-300">{resp.tlsTimeMs}ms</span>
          </div>
        )}
        {resp?.downloadTimeMs != null && (
          <div>
            <span className="text-slate-500">Download: </span>
            <span className="font-mono text-slate-300">{resp.downloadTimeMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeConfigSummary({ nodeType, config, iterations }: { nodeType: string; config: Record<string, unknown>; iterations?: Array<{ index: number; total: number; item: unknown }> }) {
  if (nodeType === 'auth') {
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Node Configuration</div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 space-y-1 text-[11px]">
          <div><span className="text-slate-500">Login URL: </span><span className="font-mono text-slate-300 break-all">{String(config.loginUrl || '(not set)')}</span></div>
          <div><span className="text-slate-500">Method: </span><span className="font-mono text-slate-300">{String(config.method || 'POST')}</span></div>
          <div><span className="text-slate-500">Token Path: </span><span className="font-mono text-emerald-400">{String(config.tokenPath || '(not set)')}</span></div>
          {config.headerName ? <div><span className="text-slate-500">Header: </span><span className="font-mono text-slate-300">{String(config.headerName)}</span></div> : null}
          {config.tokenType ? <div><span className="text-slate-500">Token Type: </span><span className="font-mono text-slate-300">{String(config.tokenType)}</span></div> : null}
        </div>
      </div>
    );
  }

  if (nodeType === 'request') {
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Node Configuration</div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 space-y-1 text-[11px]">
          <div><span className="text-slate-500">URL: </span><span className="font-mono text-slate-300 break-all">{String(config.url || '(not set)')}</span></div>
          <div><span className="text-slate-500">Method: </span><span className="font-mono text-slate-300">{String(config.method || 'GET')}</span></div>
          {config.headers && Object.keys(config.headers as object).length > 0 ? (
            <div>
              <span className="text-slate-500">Headers: </span>
              <span className="font-mono text-slate-400">{Object.keys(config.headers as object).join(', ')}</span>
            </div>
          ) : null}
          {config.extractors && Array.isArray(config.extractors) && config.extractors.length > 0 ? (
            <div>
              <span className="text-slate-500">Extractors: </span>
              <span className="font-mono text-emerald-400">{(config.extractors as Array<{name: string}>).map(e => e.name).join(', ')}</span>
            </div>
          ) : null}
          {config.assertions && Array.isArray(config.assertions) && config.assertions.length > 0 ? (
            <div>
              <span className="text-slate-500">Assertions: </span>
              <span className="font-mono text-sky-400">{(config.assertions as Array<{name: string}>).length} configured</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (nodeType === 'condition') {
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Node Configuration</div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 text-[11px]">
          <span className="text-slate-500">Expression: </span>
          <span className="font-mono text-slate-300">{String(config.expression || '')} {String(config.operator || '')} {String(config.value || '')}</span>
        </div>
      </div>
    );
  }

  if (nodeType === 'script') {
    const code = String(config.code || '');
    if (!code) return null;
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Script Code</div>
        <pre className="max-h-[100px] overflow-auto rounded-lg border border-white/5 bg-black/20 p-2 text-[10px] font-mono text-slate-400 whitespace-pre-wrap">
          {code.length > 500 ? code.substring(0, 500) + '\n... (truncated)' : code}
        </pre>
      </div>
    );
  }

  if (nodeType === 'delay') {
    return (
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Node Configuration</div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 text-[11px]">
          <span className="text-slate-500">Delay: </span>
          <span className="font-mono text-slate-300">{config.delayExpression ? String(config.delayExpression) : `${config.delayMs ?? 1000}ms`}</span>
        </div>
      </div>
    );
  }

  if (nodeType === 'loop') {
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase text-slate-500">Node Configuration</div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-2 space-y-1 text-[11px]">
          <div><span className="text-slate-500">Source: </span><span className="font-mono text-slate-300">{String(config.sourceExpression || '(not set)')}</span></div>
          <div><span className="text-slate-500">Item variable: </span><span className="font-mono text-emerald-400">{String(config.itemVariable || 'item')}</span></div>
          {config.maxIterations ? <div><span className="text-slate-500">Max iterations: </span><span className="font-mono text-slate-300">{String(config.maxIterations)}</span></div> : null}
        </div>

        {/* Loop iterations detail */}
        {iterations && iterations.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-500 mb-1">
              Loop Iterations ({iterations.length} of {iterations[0]?.total})
            </div>
            <div className="space-y-1">
              {iterations.map((iter) => {
                let parsedItem: unknown;
                try {
                  parsedItem = typeof iter.item === 'string' ? JSON.parse(iter.item) : iter.item;
                } catch {
                  parsedItem = iter.item;
                }
                return (
                  <details
                    key={iter.index}
                    className="rounded-lg border border-violet-500/15 bg-violet-500/[0.04] overflow-hidden"
                  >
                    <summary className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-violet-500/[0.08] transition select-none">
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-400">
                        #{iter.index + 1}
                      </span>
                      <span className="font-mono text-slate-400 truncate flex-1">
                        {JSON.stringify(parsedItem).slice(0, 120)}
                        {JSON.stringify(parsedItem).length > 120 ? '...' : ''}
                      </span>
                    </summary>
                    <pre className="px-2.5 pb-2 pt-1 text-[10px] text-slate-400 overflow-auto max-h-40 font-mono leading-relaxed">
                      {JSON.stringify(parsedItem, null, 2)}
                    </pre>
                  </details>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Main component ───────────────────────────────────────────────────────────

interface ReportNodeCardProps {
  nodeLabel: string;
  nodeType: string;
  nodeConfig: Record<string, unknown>;
  status: FlowNodeStatus;
  execution: FlowNodeExecution | null;
  diagnosis: ErrorDiagnosis | null;
  isExpanded: boolean;
  onToggle: () => void;
  onFixThis: (tab?: string) => void;
  executionOrder?: number;
  loopIterations?: Array<{ index: number; total: number; item: unknown }>;
}

export function ReportNodeCard({
  nodeLabel,
  nodeType,
  nodeConfig,
  status,
  execution,
  diagnosis,
  isExpanded,
  onToggle,
  onFixThis,
  executionOrder,
  loopIterations,
}: ReportNodeCardProps) {
  const purpose = describeNodePurpose(nodeType as any, nodeConfig);

  // Determine the HTTP method and URL to show in header
  const httpMethod = execution?.requestSnapshot?.method
    || (nodeConfig.method as string)
    || (nodeType === 'auth' ? 'POST' : nodeType === 'request' ? 'GET' : null);
  const httpUrl = execution?.requestSnapshot?.url
    || (nodeType === 'auth' ? nodeConfig.loginUrl as string : nodeConfig.url as string)
    || null;

  return (
    <div className={cn('rounded-lg border transition', STATUS_BG[status])}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs"
      >
        {/* Execution order */}
        {executionOrder != null && (
          <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400 mt-0.5">
            {executionOrder}
          </span>
        )}

        {/* Status dot */}
        <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full mt-1', STATUS_DOT[status])} />

        {/* Main info column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Node label + type badge */}
            <span className="font-semibold text-slate-200">{nodeLabel}</span>
            <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 uppercase">
              {NODE_TYPE_LABELS[nodeType] || nodeType}
            </span>

            {/* Status text */}
            <span className={cn('shrink-0 text-[10px] font-semibold uppercase', STATUS_TEXT[status])}>
              {status}
            </span>

            {/* Response status code */}
            {execution?.responseData?.statusCode != null && (
              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold shrink-0', statusCodeColor(execution.responseData.statusCode))}>
                {execution.responseData.statusCode}
              </span>
            )}

            {/* Duration */}
            {execution?.durationMs != null && (
              <span className="text-[10px] text-slate-500 shrink-0">{execution.durationMs}ms</span>
            )}

            {/* Error source badge */}
            {execution?.errorSource && (status === 'error' || status === 'warning') && (
              <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-medium shrink-0', ERROR_SOURCE_COLORS[execution.errorSource as ErrorSource] || ERROR_SOURCE_COLORS.unknown)}>
                {ERROR_SOURCE_LABELS[execution.errorSource as ErrorSource] || 'Error'}
              </span>
            )}
          </div>

          {/* HTTP Method + URL — always visible for auth/request nodes */}
          {httpMethod && httpUrl && (nodeType === 'auth' || nodeType === 'request') && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn('rounded border px-1 py-0.5 text-[9px] font-bold shrink-0', METHOD_COLORS[httpMethod] || 'text-slate-400 border-white/10 bg-white/5')}>
                {httpMethod}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate">{httpUrl}</span>
            </div>
          )}

          {/* Error message preview — always visible when there's an error */}
          {execution?.error && (status === 'error' || status === 'warning') && (
            <div className="mt-1 text-[10px] text-red-400/80 leading-relaxed line-clamp-2">
              {execution.error}
            </div>
          )}

          {/* Skipped reason — always visible */}
          {status === 'skipped' && execution?.error && (
            <div className="mt-1 text-[10px] text-slate-400 leading-relaxed">
              {execution.error}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <span className="text-[10px] text-slate-600 shrink-0 mt-1">
          {isExpanded ? '▾' : '▸'}
        </span>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/5 px-3 py-3 space-y-4">
          {/* Purpose */}
          <div className="text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">What this node does:</span>{' '}
            {purpose}
          </div>

          {/* Node configuration */}
          <NodeConfigSummary nodeType={nodeType} config={nodeConfig} iterations={loopIterations} />

          {/* Error diagnosis */}
          {diagnosis && (
            <ReportErrorDiagnosis
              diagnosis={diagnosis}
              onFixThis={() => onFixThis(diagnosis.relevantTab)}
            />
          )}

          {/* Raw error message (when no diagnosis available) */}
          {execution?.error && !diagnosis && status !== 'skipped' && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Error Message</div>
              <div className="rounded-lg border border-red-500/10 bg-red-500/[0.03] px-3 py-2">
                <pre className="text-[11px] text-red-300 font-mono whitespace-pre-wrap break-all">{execution.error}</pre>
              </div>
            </div>
          )}

          {/* Skipped reason (no diagnosis) */}
          {status === 'skipped' && execution?.error && !diagnosis && (
            <div className="rounded-lg border border-slate-500/10 bg-slate-500/[0.03] px-3 py-2 text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">Skipped:</span> {execution.error}
            </div>
          )}

          {/* No request made indicator — node failed before sending HTTP request */}
          {status === 'error' && execution?.error && !execution?.requestSnapshot && !execution?.responseData && (nodeType === 'auth' || nodeType === 'request') && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.03] px-3 py-2 text-[11px] text-amber-400">
              <span>⚠</span>
              <span>No HTTP request was made — the node failed before sending the request</span>
            </div>
          )}

          {/* Timing breakdown */}
          {execution && <TimingBreakdown execution={execution} />}

          {/* Request / Response — this is the key detail section */}
          {(execution?.requestSnapshot || execution?.responseData) && (
            <ReportRequestResponse
              request={execution?.requestSnapshot ?? null}
              response={execution?.responseData ?? null}
            />
          )}

          {/* Assertion results */}
          {execution?.assertionResults && execution.assertionResults.length > 0 && (
            <AssertionResultsTable results={execution.assertionResults} />
          )}

          {/* Schema validation */}
          {execution?.schemaValidation && (
            <SchemaIssuesBlock schema={execution.schemaValidation} />
          )}

          {/* Script output */}
          {execution?.scriptOutput && execution.scriptOutput.logs.length > 0 && (
            <ScriptOutputBlock output={execution.scriptOutput} />
          )}

          {/* Extracted values */}
          {execution?.extractedValues && Object.keys(execution.extractedValues).length > 0 && (
            <ExtractedValuesBlock values={execution.extractedValues} />
          )}

          {/* Empty state — when node ran but we have no details */}
          {execution && !execution.error && !execution.requestSnapshot && !execution.responseData &&
           !execution.assertionResults?.length && !execution.schemaValidation &&
           !execution.scriptOutput?.logs?.length &&
           !(execution.extractedValues && Object.keys(execution.extractedValues).length > 0) &&
           status !== 'skipped' && (
            <div className="text-[11px] text-slate-500 italic">
              Node completed successfully. No additional details available — request/response data may not have been captured for this node type.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
