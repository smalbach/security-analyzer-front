import { useMemo } from 'react';
import { ConfigField, ConfigInput } from './ConfigField';
import { TemplateInput } from './TemplateInput';
import { AvailableVariables } from './AvailableVariables';
import { GroupedDataSourceSelect } from './GroupedDataSourceSelect';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import { useUpstreamDataSources } from '../../../hooks/useUpstreamDataSources';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { jsonSchemaToFields } from './SchemaFieldRow';

interface LoopNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

/** Sanitize itemVariable: strip template syntax, keep only alphanumeric + underscore */
function sanitizeItemVar(raw: string): string {
  // Strip {{ }} wrappers
  let cleaned = raw.replace(/\{\{|\}\}/g, '');
  // Remove any nodeId.xxx prefix patterns (common misconfiguration)
  cleaned = cleaned.replace(/^[a-f0-9-]+\./i, '');
  // Keep only alphanumeric, underscore, dash
  cleaned = cleaned.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'item';
}

export function LoopNodeConfig({ config, onChange, projectId }: LoopNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });
  const completions = useTemplateCompletions(projectId);
  const dataSources = useUpstreamDataSources(projectId);
  const nodes = useFlowBuilderStore((s) => s.nodes);
  const edges = useFlowBuilderStore((s) => s.edges);
  const selectedNodeId = useFlowBuilderStore((s) => s.selectedNodeId);

  // Sanitize itemVariable — fix legacy bad values (template expressions used as var names)
  const rawItemVar = String(config.itemVariable || 'item');
  const itemVar = sanitizeItemVar(rawItemVar);

  // Auto-fix: if the stored value was a template expression, fix it
  if (rawItemVar !== itemVar && rawItemVar !== 'item') {
    // Schedule fix on next tick to avoid updating during render
    setTimeout(() => update('itemVariable', itemVar), 0);
  }

  // Check if there are any array fields available
  const hasArrayFields = dataSources.some((ds) =>
    ds.fields.some((f) => f.fieldType === 'array'),
  );

  // Detect connection issues for this loop node
  const connectionWarnings = useMemo(() => {
    if (!selectedNodeId) return [];
    const warnings: string[] = [];
    const outEdges = edges.filter((e) => e.source === selectedNodeId);
    const hasLoopItemEdge = outEdges.some((e) => e.sourceHandle === 'loop-item');
    const hasLoopDoneEdge = outEdges.some((e) => e.sourceHandle === 'loop-done');
    const hasDefaultEdge = outEdges.some((e) => !e.sourceHandle || e.sourceHandle === 'default');

    if (!hasLoopItemEdge) {
      warnings.push(
        'No nodes connected to the "Each Item" handle (right side). The loop body is empty — nothing will execute per iteration. Connect a request or condition node to the purple "Each Item" handle.',
      );
    }

    if (hasDefaultEdge && !hasLoopItemEdge) {
      warnings.push(
        'A node is connected via the default handle instead of "Each Item" or "Done". Disconnect it and reconnect to the correct handle: purple "Each Item" (right) for loop body, or gray "Done" (bottom) for after-loop.',
      );
    }

    if (!hasLoopDoneEdge && hasLoopItemEdge) {
      // Not critical but informative
    }

    return warnings;
  }, [selectedNodeId, edges]);

  // Check if sourceExpression looks valid
  const sourceExpressionWarning = useMemo(() => {
    const expr = String(config.sourceExpression || '');
    if (!expr) return null;
    // Check for nested templates
    const innerBraces = expr.replace(/^\{\{/, '').replace(/\}\}$/, '');
    if (innerBraces.includes('{{') || innerBraces.includes('}}')) {
      return 'Nested template expressions ({{ inside {{ }}) are not supported. Select a single array field from the dropdown above.';
    }
    // Check if it's a valid template
    if (!expr.match(/^\{\{[^.]+\..+\}\}$/)) {
      return `Expression "${expr}" may not resolve correctly. Use the dropdown above to select an array field, or type a valid template like {{nodeId.fieldName}}.`;
    }
    return null;
  }, [config.sourceExpression]);

  // Derive item sub-fields from the source array's schema for preview
  const itemFields = useMemo(() => {
    const sourceExpr = String(config.sourceExpression || '');
    const match = sourceExpr.match(/^\{\{([^.]+)\.(.+)\}\}$/);
    if (!match) return [];
    const [, sourceNodeRef, sourceField] = match;
    // Find source node by UUID or by label alias
    const sourceNode = nodes.find(
      (n) => n.id === sourceNodeRef || (n.data.label && String(n.data.label).toLowerCase() === sourceNodeRef.toLowerCase()),
    );
    if (!sourceNode) return [];
    const schema = (sourceNode.data.config as Record<string, unknown>).responseSchema;
    if (!schema || typeof schema !== 'object') return [];
    const sFields = jsonSchemaToFields(schema);
    const arrayField = sFields.find((f) => f.name === sourceField);
    if (arrayField?.type === 'array' && arrayField.items?.type === 'object' && arrayField.items.children?.length) {
      return arrayField.items.children
        .filter((c) => c.name.trim())
        .map((c) => ({ name: c.name, type: c.type }));
    }
    return [];
  }, [config.sourceExpression, nodes]);

  return (
    <div className="space-y-3">
      {/* Connection warnings */}
      {connectionWarnings.length > 0 && (
        <div className="space-y-1.5">
          {connectionWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-[10px] text-red-300"
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <AvailableVariables projectId={projectId} />

      {/* Visual array source picker */}
      <ConfigField
        label="Array Source"
        help="Select an array field from an upstream node to iterate over. Only array-type fields are shown here. If no arrays appear, define an array field in an upstream node's Response Schema and generate extractors."
      >
        <GroupedDataSourceSelect
          dataSources={dataSources}
          value={String(config.sourceExpression || '')}
          onChange={(v) => update('sourceExpression', v)}
          filterFieldType="array"
          placeholder="Select an array to iterate over..."
          emptyMessage="No array fields found. Define arrays in upstream Response Schemas and generate extractors."
        />
      </ConfigField>

      {/* Source expression warning */}
      {sourceExpressionWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[10px] text-amber-300">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{sourceExpressionWarning}</span>
        </div>
      )}

      {/* Manual fallback / all sources */}
      {!hasArrayFields && (
        <ConfigField
          label="Source Expression (manual)"
          help="If no array fields appear above, type a template expression pointing to an array. Type {{ to browse all available variables."
        >
          <TemplateInput
            value={String(config.sourceExpression || '')}
            onChange={(v) => update('sourceExpression', v)}
            completions={completions}
            placeholder="Type {{ to select a source array..."
          />
        </ConfigField>
      )}

      {/* Show the resolved expression for clarity */}
      {!!config.sourceExpression && !sourceExpressionWarning && (
        <div className="rounded bg-white/[0.03] px-2 py-1">
          <span className="text-[9px] text-slate-500">Source expression: </span>
          <span className="font-mono text-[10px] text-slate-300">{String(config.sourceExpression)}</span>
        </div>
      )}

      <ConfigField
        label="Item Variable Name"
        help="A simple name for the current iteration item (e.g. 'item', 'campaign'). Downstream nodes reference it as {{loopId.item}}. This should be a plain name, NOT a template expression."
      >
        <ConfigInput
          value={itemVar}
          onChange={(v) => update('itemVariable', sanitizeItemVar(v))}
          placeholder="item"
          mono
        />
        {rawItemVar !== itemVar && rawItemVar !== 'item' && (
          <div className="mt-1 text-[9px] text-amber-400">
            Auto-corrected from &quot;{rawItemVar}&quot; → variable names must be plain text, not template expressions.
          </div>
        )}
      </ConfigField>

      {/* Item fields preview: show what fields downstream nodes can access */}
      {itemFields.length > 0 && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-2">
          <div className="text-[10px] font-semibold text-violet-300/80">
            Each item has {itemFields.length} field{itemFields.length > 1 ? 's' : ''}:
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {itemFields.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-1 rounded bg-violet-500/10 px-1.5 py-0.5"
              >
                <span className="font-mono text-[10px] font-medium text-violet-300">
                  {itemVar}.{f.name}
                </span>
                <span className="rounded bg-white/5 px-0.5 text-[8px] text-slate-500">
                  {f.type}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[9px] text-violet-300/50">
            Use <span className="font-mono text-violet-400">{'{{'}loopId.{itemVar}.fieldName{'}}'}</span> in downstream nodes
          </div>
        </div>
      )}

      <ConfigField
        label="Max Iterations"
        help="Optional safety limit. Set to 0 or leave empty for no limit. Useful to prevent infinite loops on large datasets."
      >
        <ConfigInput
          value={String(config.maxIterations || '')}
          onChange={(v) => update('maxIterations', v ? Number(v) : undefined)}
          placeholder="No limit"
          type="number"
        />
      </ConfigField>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-2 text-[10px] text-violet-300/80">
        <strong>How loops work:</strong>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-violet-300/60">
          <li>
            Connect nodes to the <span className="inline-flex items-center gap-0.5 rounded bg-violet-500/20 px-1 font-semibold text-violet-400">Each Item</span> handle (right side, purple) — they execute <strong>once per item</strong>
          </li>
          <li>
            Connect nodes to the <span className="inline-flex items-center gap-0.5 rounded bg-slate-500/20 px-1 font-semibold text-slate-400">Done</span> handle (bottom, gray) — they execute <strong>once</strong> after all iterations
          </li>
          <li>
            Inside the loop body, use{' '}
            <span className="font-mono text-violet-400">{'{{'}loopId.{itemVar}{'}}'}</span>{' '}
            to access the current item
          </li>
          {itemFields.length > 0 && (
            <li>
              Access item properties:{' '}
              <span className="font-mono text-violet-400">
                {'{{'}loopId.{itemVar}.{itemFields[0].name}{'}}'}
              </span>
              {itemFields.length > 1 && `, etc.`}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
