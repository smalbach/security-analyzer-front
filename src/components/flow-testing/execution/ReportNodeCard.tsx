import { cn } from '../../../lib/cn';
import { describeNodePurpose, type ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import type { FlowNodeExecution, FlowNodeStatus, FlowAssertionResult, FlowSchemaValidationResult, FlowScriptOutput } from '../../../types/flow';
import { ReportErrorDiagnosis } from './ReportErrorDiagnosis';
import { ReportRequestResponse } from './ReportRequestResponse';

// ── Status visual maps (same as ExecutionTimeline) ───────────────────────────
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
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase text-slate-500">Assertions</div>
      {failed.length > 0 && (
        <div className="space-y-0.5">
          {failed.map((a, i) => (
            <div key={`f-${i}`} className="flex items-start gap-2 rounded bg-red-500/[0.05] px-2 py-1 text-[11px]">
              <span className="mt-0.5 text-red-400 shrink-0">✗</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-red-300">{a.name}</span>
                {a.message && <span className="text-slate-400 ml-1">— {a.message}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {passed.length > 0 && (
        <div className="text-[11px] text-emerald-400/70">
          ✓ {passed.length} assertion{passed.length > 1 ? 's' : ''} passed
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
        <pre className="max-h-[100px] overflow-auto rounded bg-black/30 px-2 py-1.5 text-[10px] text-slate-400 font-mono">
          {output.logs.join('\n')}
        </pre>
      )}
      {output.variables && Object.keys(output.variables).length > 0 && (
        <div className="space-y-0.5 mt-1">
          <div className="text-[10px] text-slate-500">Variables set:</div>
          {Object.entries(output.variables).map(([key, val]) => (
            <div key={key} className="flex gap-1 text-[10px]">
              <span className="font-mono text-emerald-400">{key}:</span>
              <span className="text-slate-400 truncate">{JSON.stringify(val)}</span>
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
      <div className="space-y-0.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-1 text-[10px]">
            <span className="font-mono text-emerald-400">{key}:</span>
            <span className="text-slate-400 truncate">{JSON.stringify(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
}: ReportNodeCardProps) {
  const purpose = describeNodePurpose(nodeType as any, nodeConfig);
  const hasDetails = execution && (
    execution.error ||
    execution.assertionResults?.length ||
    execution.schemaValidation ||
    execution.scriptOutput?.logs?.length ||
    execution.requestSnapshot ||
    execution.responseData ||
    (execution.extractedValues && Object.keys(execution.extractedValues).length > 0)
  );

  return (
    <div className={cn('rounded-lg border transition', STATUS_BG[status])}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        {/* Status dot */}
        <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[status])} />

        {/* Node label + type badge */}
        <span className="font-semibold text-slate-200 truncate max-w-[140px]">{nodeLabel}</span>
        <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 uppercase">
          {NODE_TYPE_LABELS[nodeType] || nodeType}
        </span>

        {/* Status text */}
        <span className={cn('shrink-0 text-[10px] font-semibold uppercase', STATUS_TEXT[status])}>
          {status}
        </span>

        {/* Duration */}
        {execution?.durationMs != null && (
          <span className="text-[10px] text-slate-500">{execution.durationMs}ms</span>
        )}

        {/* Purpose preview (collapsed only) */}
        {!isExpanded && (
          <span className="ml-1 text-[10px] text-slate-600 truncate max-w-[300px]">
            — {purpose}
          </span>
        )}

        {/* Compact error preview (collapsed only) */}
        {!isExpanded && execution?.error && (
          <span className="ml-auto max-w-[200px] truncate text-[10px] text-red-400" title={execution.error}>
            {execution.error}
          </span>
        )}

        {/* Expand indicator */}
        {hasDetails && (
          <span className="ml-auto text-[10px] text-slate-600">
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/5 px-3 py-3 space-y-3">
          {/* Purpose */}
          <div className="text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">What this node does:</span>{' '}
            {purpose}
          </div>

          {/* Error diagnosis */}
          {diagnosis && (
            <ReportErrorDiagnosis
              diagnosis={diagnosis}
              onFixThis={() => onFixThis(diagnosis.relevantTab)}
            />
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

          {/* Request / Response */}
          {(execution?.requestSnapshot || execution?.responseData) && (
            <ReportRequestResponse
              request={execution.requestSnapshot}
              response={execution.responseData}
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
        </div>
      )}
    </div>
  );
}
