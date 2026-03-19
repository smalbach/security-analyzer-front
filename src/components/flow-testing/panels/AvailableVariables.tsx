import { useMemo, useState } from 'react';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { useTemplateCompletions, type TemplateCompletion } from '../../../hooks/useTemplateCompletions';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import type { FlowNodeExtractor } from '../../../types/flow';
import { jsonSchemaToFields, schemaFieldsToExtractors } from './SchemaFieldRow';

interface AvailableVariablesProps {
  projectId: string;
  variableMappings?: Array<Record<string, unknown>>;
}

const TYPE_COLORS: Record<string, { badge: string; text: string }> = {
  env: { badge: 'bg-emerald-500/15 text-emerald-400', text: 'text-emerald-400' },
  extractor: { badge: 'bg-sky-500/15 text-sky-400', text: 'text-sky-400' },
  var: { badge: 'bg-amber-500/15 text-amber-400', text: 'text-amber-400' },
  loop: { badge: 'bg-violet-500/15 text-violet-400', text: 'text-violet-400' },
  schema: { badge: 'bg-orange-500/15 text-orange-400', text: 'text-orange-400' },
};

const TYPE_LABELS: Record<string, string> = {
  env: 'ENV',
  extractor: 'NODE',
  var: 'VAR',
  loop: 'LOOP',
  schema: 'FIELD',
};

const SECTION_LABELS: Record<string, string> = {
  env: 'Environment Variables',
  extractor: 'Upstream Node Outputs',
  var: 'Flow Variables',
  loop: 'Loop Variables',
  schema: 'Schema Fields (not yet extracted)',
};

/**
 * Collapsible panel showing all available template variables for the currently
 * selected node. Grouped by type (env, node extractors, schema fields, loop vars,
 * flow vars) with copy-to-clipboard for each variable. Shows "USED" badges for
 * variables consumed by variable mappings.
 */
export function AvailableVariables({ projectId, variableMappings }: AvailableVariablesProps) {
  const completions = useTemplateCompletions(projectId);
  const [collapsed, setCollapsed] = useState(true);
  const { copyToClipboard: clipboardCopy } = useCopyToClipboard(1500);
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
    const loopVars = completions.filter((c) => c.type === 'loop');
    const schemaVars = completions.filter((c) => c.type === 'schema');

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

    // Group schema vars by upstream node
    const schemaByNode = new Map<string, { label: string; nodeId: string; items: TemplateCompletion[] }>();
    for (const sv of schemaVars) {
      const nodeId = sv.suggestedExtractor?.nodeId || 'unknown';
      if (!schemaByNode.has(nodeId)) {
        const node = nodes.find((n) => n.id === nodeId);
        schemaByNode.set(nodeId, {
          label: node?.data?.label || nodeId.slice(0, 8),
          nodeId,
          items: [],
        });
      }
      schemaByNode.get(nodeId)!.items.push(sv);
    }

    return { envVars, extractorsByNode, flowVars, loopVars, schemaByNode };
  }, [completions, nodes]);

  const totalCount = completions.length;
  const usedCount = usageMap.size;

  const copyToClipboard = (label: string) => {
    void clipboardCopy(label);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 1500);
  };

  /** Auto-create a single extractor on the upstream node */
  const createExtractor = (completion: TemplateCompletion) => {
    if (!completion.suggestedExtractor) return;
    const { nodeId, name, expression } = completion.suggestedExtractor;
    const store = useFlowBuilderStore.getState();
    const node = store.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const config = node.data.config as Record<string, unknown>;
    const existing = (config.extractors || []) as FlowNodeExtractor[];
    if (existing.some((e) => e.name === name)) return;
    store.updateNodeConfig(nodeId, {
      ...config,
      extractors: [...existing, { name, expression, type: 'jsonpath' }],
    });
  };

  /** Auto-create ALL extractors for an upstream node from its schema */
  const createAllExtractorsForNode = (nodeId: string) => {
    const store = useFlowBuilderStore.getState();
    const node = store.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const config = node.data.config as Record<string, unknown>;
    if (!config.responseSchema || typeof config.responseSchema !== 'object') return;
    const fields = jsonSchemaToFields(config.responseSchema);
    const suggested = schemaFieldsToExtractors(fields);
    const existing = (config.extractors || []) as FlowNodeExtractor[];
    const existingNames = new Set(existing.map((e) => e.name));
    const newExtractors = suggested.filter((s) => !existingNames.has(s.name));
    if (newExtractors.length === 0) return;
    store.updateNodeConfig(nodeId, {
      ...config,
      extractors: [...existing, ...newExtractors],
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

          {/* Schema Fields (not yet extracted) */}
          {grouped.schemaByNode.size > 0 && (
            <VariableSection type="schema" count={Array.from(grouped.schemaByNode.values()).reduce((a, b) => a + b.items.length, 0)}>
              {Array.from(grouped.schemaByNode.entries()).map(([nodeId, group]) => (
                <div key={nodeId} className="space-y-0.5">
                  <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400/60" />
                      <span className="text-[10px] font-medium text-orange-400/80">{group.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => createAllExtractorsForNode(group.nodeId)}
                      className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-orange-400 transition hover:bg-orange-500/25"
                    >
                      Extract All
                    </button>
                  </div>
                  {group.items.map((c) => (
                    <SchemaVariableRow
                      key={c.label}
                      completion={c}
                      copied={copiedLabel === c.label}
                      onCopy={copyToClipboard}
                      onCreateExtractor={createExtractor}
                    />
                  ))}
                </div>
              ))}
            </VariableSection>
          )}

          {/* Loop Variables */}
          {grouped.loopVars.length > 0 && (
            <VariableSection type="loop" count={grouped.loopVars.length}>
              {grouped.loopVars.map((c) => (
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
  const shortName = completion.displayLabel.includes('.')
    ? completion.displayLabel.split('.').pop() || completion.displayLabel
    : completion.displayLabel;

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

function SchemaVariableRow({
  completion,
  copied,
  onCopy,
  onCreateExtractor,
}: {
  completion: TemplateCompletion;
  copied: boolean;
  onCopy: (label: string) => void;
  onCreateExtractor: (c: TemplateCompletion) => void;
}) {
  const shortName = completion.displayLabel.includes('.')
    ? completion.displayLabel.split('.').pop() || completion.displayLabel
    : completion.displayLabel;

  const jsonPath = completion.suggestedExtractor?.expression || '';

  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 transition hover:bg-white/5">
      <span className="min-w-0 shrink-0 font-mono text-[10px] font-medium text-orange-300/80">
        {shortName}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[8px] text-slate-600" title={jsonPath}>
        {jsonPath}
      </span>
      <button
        type="button"
        onClick={() => onCreateExtractor(completion)}
        className="shrink-0 rounded bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-orange-400 opacity-0 transition group-hover:opacity-100 hover:bg-orange-500/25"
        title="Create extractor for this schema field"
      >
        Extract
      </button>
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
