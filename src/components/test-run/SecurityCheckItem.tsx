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
        <span
          className={`mt-0.5 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
            check.passed
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-400/30 bg-red-500/10 text-red-300'
          }`}
        >
          {check.passed ? 'PASS' : 'FAIL'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{check.ruleName}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${SEVERITY_BADGE[check.severity]}`}>
              {check.severity}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              {check.category}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[11px] text-slate-500">
              {check.ruleId}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {check.passed
              ? check.description || 'This check passed without findings.'
              : check.finding || check.description}
          </p>
        </div>
        <span className="shrink-0 text-slate-500">{expanded ? '^' : 'v'}</span>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-300">{check.description}</p>
          </div>
          {check.finding ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Finding</p>
              <p className="mt-1 text-sm text-slate-300">{check.finding}</p>
            </div>
          ) : null}
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
          {check.references?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">References</p>
              <div className="mt-1 space-y-1 text-sm">
                {check.references.map((reference, index) => (
                  <a
                    key={`${check.ruleId}-ref-${index}`}
                    href={reference}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-tide-300 hover:text-tide-200 hover:underline"
                  >
                    {reference}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
