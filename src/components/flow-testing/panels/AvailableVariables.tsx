import { useMemo, useState } from 'react';
import { useTemplateCompletions, type TemplateCompletion } from '../../../hooks/useTemplateCompletions';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';

interface AvailableVariablesProps {
  projectId: string;
  variableMappings?: Array<Record<string, unknown>>;
}

const TYPE_COLORS: Record<string, { badge: string; text: string }> = {
  env: { badge: 'bg-emerald-500/15 text-emerald-400', text: 'text-emerald-400' },
  extractor: { badge: 'bg-sky-500/15 text-sky-400', text: 'text-sky-400' },
  var: { badge: 'bg-amber-500/15 text-amber-400', text: 'text-amber-400' },
};

const TYPE_LABELS: Record<string, string> = {
  env: 'ENV',
  extractor: 'NODE',
  var: 'VAR',
};

const SECTION_LABELS: Record<string, string> = {
  env: 'Environment Variables',
  extractor: 'Upstream Node Outputs',
  var: 'Flow Variables',
};

/**
 * Collapsible panel showing all available template variables for the currently
 * selected node. Grouped by type (env, node extractors, flow vars) with
 * copy-to-clipboard for each variable. Shows "USED" badges for variables
 * consumed by variable mappings.
 */
export function AvailableVariables({ projectId, variableMappings }: AvailableVariablesProps) {
  const completions = useTemplateCompletions(projectId);
  const [collapsed, setCollapsed] = useState(true);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const nodes = useFlowBuilderStore((s) => s.nodes);

  // Build a map of used variables: sourceExpression → targetPath
  const usageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!variableMappings) return map;
    for (const m of variableMappings) {
      const expr = String(m.sourceExpression || '');
      const target = String(m.targetPath || '');
      if (expr) map.set(expr, target);
    }
    return map;
  }, [variableMappings]);

  const grouped = useMemo(() => {
    const envVars = completions.filter((c) => c.type === 'env');
    const extractors = completions.filter((c) => c.type === 'extractor');
    const flowVars = completions.filter((c) => c.type === 'var');

    // Group extractors by upstream node
    const extractorsByNode = new Map<string, { label: string; items: TemplateCompletion[] }>();
    for (const ext of extractors) {
      const match = ext.label.match(/\{\{([^.]+)\./);
      const nodeId = match?.[1] || 'unknown';
      if (!extractorsByNode.has(nodeId)) {
        const node = nodes.find((n) => n.id === nodeId);
        extractorsByNode.set(nodeId, { label: node?.data?.label || nodeId.slice(0, 8), items: [] });
      }
      extractorsByNode.get(nodeId)!.items.push(ext);
    }

    return { envVars, extractorsByNode, flowVars };
  }, [completions, nodes]);

  const totalCount = completions.length;
  const usedCount = usageMap.size;

  const copyToClipboard = (label: string) => {
    navigator.clipboard.writeText(label).then(() => {
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 1500);
    });
  };

  if (totalCount === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-white/5"
      >
        <svg
          className={`h-3 w-3 text-slate-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Available Variables
        </span>
        {usedCount > 0 && (
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
            {usedCount} used
          </span>
        )}
        <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-600">
          {totalCount}
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-2 border-t border-white/5 px-2.5 py-2">
          {/* Hint */}
          <p className="text-[10px] text-slate-600">
            Click copy to get the template syntax. Paste into any field that supports {'{{'}...{'}}'}.
          </p>

          {/* Environment Variables */}
          {grouped.envVars.length > 0 && (
            <VariableSection type="env" count={grouped.envVars.length}>
              {grouped.envVars.map((c) => (
                <VariableRow
                  key={c.label}
                  completion={c}
                  copied={copiedLabel === c.label}
                  onCopy={copyToClipboard}
                  usageTarget={usageMap.get(c.label)}
                />
              ))}
            </VariableSection>
          )}

          {/* Upstream Node Extractors */}
          {grouped.extractorsByNode.size > 0 && (
            <VariableSection type="extractor" count={Array.from(grouped.extractorsByNode.values()).reduce((a, b) => a + b.items.length, 0)}>
              {Array.from(grouped.extractorsByNode.entries()).map(([nodeId, group]) => (
                <div key={nodeId} className="space-y-0.5">
                  <div className="flex items-center gap-1.5 px-1 pt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-400/60" />
                    <span className="text-[10px] font-medium text-sky-400/80">{group.label}</span>
                  </div>
                  {group.items.map((c) => (
                    <VariableRow
                      key={c.label}
                      completion={c}
                      copied={copiedLabel === c.label}
                      onCopy={copyToClipboard}
                      usageTarget={usageMap.get(c.label)}
                    />
                  ))}
                </div>
              ))}
            </VariableSection>
          )}

          {/* Flow Variables */}
          {grouped.flowVars.length > 0 && (
            <VariableSection type="var" count={grouped.flowVars.length}>
              {grouped.flowVars.map((c) => (
                <VariableRow
                  key={c.label}
                  completion={c}
                  copied={copiedLabel === c.label}
                  onCopy={copyToClipboard}
                  usageTarget={usageMap.get(c.label)}
                />
              ))}
            </VariableSection>
          )}
        </div>
      )}
    </div>
  );
}

function VariableSection({ type, count, children }: { type: string; count: number; children: React.ReactNode }) {
  const colors = TYPE_COLORS[type] || TYPE_COLORS.env;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`rounded px-1 py-0.5 text-[8px] font-bold uppercase ${colors.badge}`}>
          {TYPE_LABELS[type] || type}
        </span>
        <span className="text-[10px] text-slate-500">{SECTION_LABELS[type] || type}</span>
        <span className="text-[9px] text-slate-600">({count})</span>
      </div>
      <div className="rounded-md border border-white/5 bg-white/[0.02]">
        {children}
      </div>
    </div>
  );
}

function VariableRow({
  completion,
  copied,
  onCopy,
  usageTarget,
}: {
  completion: TemplateCompletion;
  copied: boolean;
  onCopy: (label: string) => void;
  usageTarget?: string;
}) {
  // Extract short name from displayLabel (e.g. "env.baseUrl" → "baseUrl", "Auth Login.__token" → "__token")
  const shortName = completion.displayLabel.includes('.')
    ? completion.displayLabel.split('.').pop() || completion.displayLabel
    : completion.displayLabel;

  // Extract detail value (after the " · ")
  const detailValue = completion.detail.includes(' \u00B7 ')
    ? completion.detail.split(' \u00B7 ').pop() || ''
    : completion.detail;

  const isUsed = usageTarget !== undefined;

  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 transition hover:bg-white/5">
      <span className="min-w-0 shrink-0 font-mono text-[10px] font-medium text-slate-300">
        {shortName}
      </span>
      {isUsed && (
        <span className="shrink-0 flex items-center gap-0.5 rounded bg-emerald-500/15 px-1 py-0.5 text-[8px] font-bold text-emerald-400" title={`Mapped to: ${usageTarget}`}>
          USED
          {usageTarget && (
            <span className="font-normal text-emerald-400/70">
              → {usageTarget}
            </span>
          )}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[9px] text-slate-600" title={detailValue}>
        {detailValue}
      </span>
      <button
        type="button"
        onClick={() => onCopy(completion.label)}
        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium transition ${
          copied
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-white/5 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300'
        }`}
        title={`Copy ${completion.label}`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
