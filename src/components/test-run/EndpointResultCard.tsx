import { useState } from 'react';
import type { EndpointTestResult } from '../../types/api';
import { EndpointHttpResultList } from './EndpointHttpResultList';
import { SecurityCheckItem } from './SecurityCheckItem';
import type { FilteredEndpointResult } from './filtering';

interface EndpointResultCardProps {
  result: EndpointTestResult | FilteredEndpointResult;
}

export function EndpointResultCard({ result }: EndpointResultCardProps) {
  const [open, setOpen] = useState(false);
  const failures = result.checks.filter((check) => !check.passed);
  const hasIssues = failures.length > 0;
  const totalCheckCount = 'totalCheckCount' in result ? result.totalCheckCount : result.checks.length;
  const totalHttpResultCount = 'totalHttpResultCount' in result ? result.totalHttpResultCount : result.httpResults.length;
  const isCheckFiltered = totalCheckCount !== result.checks.length;
  const isHttpFiltered = totalHttpResultCount !== result.httpResults.length;

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
          <span className="text-xs text-slate-500">
            {result.httpResults.length}/{totalHttpResultCount} runs
          </span>
          <span className="text-slate-500">{open ? '^' : 'v'}</span>
        </div>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Tested {new Date(result.testedAt).toLocaleString()}</span>
            {isCheckFiltered ? <span>{result.checks.length}/{totalCheckCount} checks shown</span> : null}
            {isHttpFiltered ? <span>{result.httpResults.length}/{totalHttpResultCount} HTTP runs shown</span> : null}
          </div>

          <EndpointHttpResultList httpResults={result.httpResults} totalCount={totalHttpResultCount} />

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Security checks</p>
              {isCheckFiltered ? (
                <span className="text-xs text-slate-500">
                  Showing {result.checks.length} of {totalCheckCount}
                </span>
              ) : null}
            </div>

            {result.checks.length === 0 ? (
              <p className="text-sm text-slate-500">
                {totalCheckCount > 0 ? 'No security checks match the current filters.' : 'No checks performed.'}
              </p>
            ) : (
              [...result.checks]
                .sort((left, right) => (left.passed === right.passed ? 0 : left.passed ? 1 : -1))
                .map((check, index) => (
                  <SecurityCheckItem key={`${result.url}-${check.ruleId}-${index}`} check={check} />
                ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
