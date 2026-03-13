import { useState } from 'react';
import type { FindingGroup } from '../../types/api';
import { SEVERITY_BADGE } from './constants';

interface ExecutiveReportSectionProps {
  findingGroups: FindingGroup[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function FindingGroupCard({ group }: { group: FindingGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [endpointsExpanded, setEndpointsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/3">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${SEVERITY_BADGE[group.severity as keyof typeof SEVERITY_BADGE] ?? SEVERITY_BADGE.info}`}>
              {group.severity}
            </span>
            <span className="text-sm font-semibold text-slate-200">{group.ruleName}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              {group.category}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-[11px] text-slate-500">
              {group.ruleId}
            </span>
            <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              {group.affectedEndpointsCount} endpoint{group.affectedEndpointsCount !== 1 ? 's' : ''} affected
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{group.finding}</p>
        </div>
        <span className="shrink-0 text-slate-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">

          {/* Affected endpoints */}
          {group.affectedEndpoints.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={() => setEndpointsExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400"
              >
                Affected Endpoints ({group.affectedEndpoints.length})
                <span>{endpointsExpanded ? '▲' : '▼'}</span>
              </button>
              {endpointsExpanded ? (
                <ul className="mt-2 space-y-1">
                  {group.affectedEndpoints.map((ep, i) => (
                    <li key={`${ep.method}-${ep.url}-${i}`} className="flex items-center gap-2 font-mono text-xs">
                      <span className="w-14 shrink-0 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-center text-slate-400">
                        {ep.method}
                      </span>
                      <span className="break-all text-slate-300">{ep.url}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {/* Proposed solution */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-tide-400">Proposed Solution</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{group.proposedSolution}</p>
          </div>

          {/* Common industry fix */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Common Industry Fix</p>
            <p className="mt-1 text-sm text-slate-300">{group.commonFix}</p>
          </div>

          {/* Code example */}
          {group.codeExample ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Code Example</p>
              <pre className="mt-1 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-slate-200">
                {group.codeExample}
              </pre>
            </div>
          ) : null}

          {/* Original remediation */}
          {group.remediation && group.remediation !== group.proposedSolution ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rule Remediation</p>
              <p className="mt-1 text-xs text-slate-500">{group.remediation}</p>
            </div>
          ) : null}

          {/* References */}
          {group.references?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">References</p>
              <div className="mt-1 space-y-1 text-xs">
                {group.references.map((ref, i) => (
                  <a
                    key={`${group.ruleId}-ref-${i}`}
                    href={ref}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-tide-300 hover:text-tide-200 hover:underline"
                  >
                    {ref}
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

export function ExecutiveReportSection({ findingGroups }: ExecutiveReportSectionProps) {
  const sorted = [...findingGroups].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
  );

  const criticalAndHigh = sorted.filter((g) => g.severity === 'critical' || g.severity === 'high');
  const medium = sorted.filter((g) => g.severity === 'medium');
  const lowAndInfo = sorted.filter((g) => g.severity === 'low' || g.severity === 'info');

  const groups: { label: string; color: string; items: FindingGroup[] }[] = [
    { label: 'Critical & High', color: 'text-red-400', items: criticalAndHigh },
    { label: 'Medium', color: 'text-amber-400', items: medium },
    { label: 'Low & Info', color: 'text-teal-400', items: lowAndInfo },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-200">Executive Report — Finding Groups</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-sm text-slate-400">
          {findingGroups.length} finding type{findingGroups.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Each finding type is grouped below with a specific proposed solution and the most common industry fix.
        Expand a card to see affected endpoints, remediation steps, and code examples.
      </p>

      <div className="space-y-6">
        {groups.map(({ label, color, items }) => (
          <div key={label}>
            <h3 className={`mb-2 text-sm font-semibold ${color}`}>{label}</h3>
            <div className="space-y-2">
              {items.map((group) => (
                <FindingGroupCard key={group.ruleId} group={group} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
