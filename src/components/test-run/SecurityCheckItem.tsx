import { useState } from 'react';
import type { SecurityCheck } from '../../types/api';
import { SEVERITY_BADGE } from './constants';

interface SecurityCheckItemProps {
  check: SecurityCheck;
}

export function SecurityCheckItem({ check }: SecurityCheckItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border ${check.passed ? 'border-emerald-500/20' : 'border-red-500/20'} bg-white/3 p-3`}
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="mt-0.5 shrink-0 text-base">{check.passed ? 'PASS' : 'FAIL'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{check.ruleName}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SEVERITY_BADGE[check.severity]}`}>
              {check.severity}
            </span>
          </div>
          {!check.passed ? <p className="mt-0.5 text-xs text-slate-400">{check.finding}</p> : null}
        </div>
        <span className="shrink-0 text-slate-500">{expanded ? '^' : 'v'}</span>
      </button>

      {expanded && !check.passed ? (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-300">{check.description}</p>
          </div>
          {check.remediation ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remediation</p>
              <p className="mt-1 text-sm text-slate-300">{check.remediation}</p>
            </div>
          ) : null}
          {check.evidence ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p>
              <pre className="mt-1 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-xs text-slate-300">
                {check.evidence}
              </pre>
            </div>
          ) : null}
          {check.reproduceSteps?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Steps to Reproduce</p>
              <ol className="mt-1 list-decimal pl-4 text-sm text-slate-300">
                {check.reproduceSteps.map((step, index) => (
                  <li key={`${check.ruleName}-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
