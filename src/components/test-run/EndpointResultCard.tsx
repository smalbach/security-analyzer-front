import { useState } from 'react';
import type { EndpointTestResult } from '../../types/api';
import { SecurityCheckItem } from './SecurityCheckItem';

interface EndpointResultCardProps {
  result: EndpointTestResult;
}

export function EndpointResultCard({ result }: EndpointResultCardProps) {
  const [open, setOpen] = useState(false);
  const failures = result.checks.filter((check) => !check.passed);
  const hasIssues = failures.length > 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${hasIssues ? 'border-red-500/20' : 'border-emerald-500/20'} bg-white/5`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`font-mono text-xs font-bold ${hasIssues ? 'text-red-400' : 'text-emerald-400'}`}>
          {result.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-200">{result.url}</span>
        <div className="flex shrink-0 items-center gap-3">
          {result.criticalFindings > 0 ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
              {result.criticalFindings} critical
            </span>
          ) : null}
          {result.highFindings > 0 ? (
            <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
              {result.highFindings} high
            </span>
          ) : null}
          <span className="text-xs text-slate-500">
            {result.passedChecks}/{result.passedChecks + result.failedChecks} passed
          </span>
          <span className="text-slate-500">{open ? '^' : 'v'}</span>
        </div>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-white/10 p-4">
          {result.checks.length === 0 ? (
            <p className="text-sm text-slate-500">No checks performed.</p>
          ) : (
            result.checks
              .sort((left, right) => (left.passed === right.passed ? 0 : left.passed ? 1 : -1))
              .map((check, index) => (
                <SecurityCheckItem key={`${result.url}-${check.ruleId}-${index}`} check={check} />
              ))
          )}
        </div>
      ) : null}
    </div>
  );
}
