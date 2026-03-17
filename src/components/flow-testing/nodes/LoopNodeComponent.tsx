import { useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNodeWrapper } from './BaseNodeWrapper';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { jsonSchemaToFields } from '../panels/SchemaFieldRow';
import type { FlowCanvasNodeData, LoopNodeConfig } from '../../../types/flow';

/** Parse "{{nodeRef.field}}" → { nodeRef, field } */
function parseSourceExpr(expr: string): { nodeRef: string; field: string } | null {
  const m = expr.match(/^\{\{([^.]+)\.(.+)\}\}$/);
  return m ? { nodeRef: m[1], field: m[2] } : null;
}

/** Sanitize itemVariable: strip template syntax */
function sanitizeItemVar(raw: string): string {
  let cleaned = raw.replace(/\{\{|\}\}/g, '');
  cleaned = cleaned.replace(/^[a-f0-9-]+\./i, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'item';
}

export function LoopNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as unknown as LoopNodeConfig;
  const nodes = useFlowBuilderStore((s) => s.nodes);
  const edges = useFlowBuilderStore((s) => s.edges);

  const rawItemVar = config?.itemVariable || 'item';
  const itemVar = sanitizeItemVar(rawItemVar);

  // Check for missing loop-item connections
  const hasLoopItemEdge = useMemo(() => {
    return edges.some((e) => e.source === id && e.sourceHandle === 'loop-item');
  }, [edges, id]);

  // Resolve human-readable source label + item sub-fields from schema
  const { sourceLabel, itemFields } = useMemo(() => {
    if (!config?.sourceExpression) return { sourceLabel: '', itemFields: [] as string[] };
    const parsed = parseSourceExpr(config.sourceExpression);
    if (!parsed) return { sourceLabel: config.sourceExpression, itemFields: [] as string[] };

    // Find source node by UUID or by label alias
    const sourceNode = nodes.find(
      (n) => n.id === parsed.nodeRef || (n.data.label && String(n.data.label).toLowerCase() === parsed.nodeRef.toLowerCase()),
    );
    const label = sourceNode
      ? `${sourceNode.data.label || parsed.nodeRef.slice(0, 8)}.${parsed.field}`
      : config.sourceExpression;

    // Derive item sub-fields from source schema
    const fields: string[] = [];
    if (sourceNode) {
      const schema = (sourceNode.data.config as Record<string, unknown>).responseSchema;
      if (schema && typeof schema === 'object') {
        const sFields = jsonSchemaToFields(schema);
        const arrayField = sFields.find((f) => f.name === parsed.field);
        if (arrayField?.type === 'array' && arrayField.items?.type === 'object' && arrayField.items.children?.length) {
          for (const child of arrayField.items.children) {
            if (child.name.trim()) fields.push(child.name);
          }
        }
      }
    }

    return { sourceLabel: label, itemFields: fields };
  }, [config?.sourceExpression, nodes]);

  return (
    <BaseNodeWrapper
      nodeType="loop"
      nodeId={id}
      label={nodeData.label}
      status={nodeData.status}
      retryAttempt={nodeData.retryAttempt}
      maxRetries={nodeData.maxRetries}
      durationMs={nodeData.durationMs}
      error={nodeData.error}
      selected={selected}
      hideDefaultSource
      sourceHandles={[
        { id: 'loop-item', label: 'Each Item', color: '#a855f7' },
        { id: 'loop-done', label: 'Done', position: 'bottom', color: '#6b7280' },
      ]}
    >
      {config?.sourceExpression ? (
        <>
          <div className="font-mono truncate">
            each <span className="text-violet-400">{itemVar}</span>
          </div>
          <div className="truncate opacity-70">in {sourceLabel}</div>
          {!!config.maxIterations && (
            <div className="opacity-50">max: {config.maxIterations}</div>
          )}
        </>
      ) : (
        <div className="italic opacity-50">Configure loop source</div>
      )}

      {/* Warning: no nodes connected to loop-item handle */}
      {config?.sourceExpression && !hasLoopItemEdge && (
        <div className="mt-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[7px] font-medium text-red-400">
          ⚠ No nodes in loop body — connect to &quot;Each Item&quot;
        </div>
      )}

      {/* Output badges: loop variables available to body nodes */}
      <div className="mt-1 flex flex-wrap gap-0.5">
        <span className="rounded bg-violet-500/15 px-1 py-0.5 text-[7px] font-medium text-violet-400">
          {itemVar}
        </span>
        <span className="rounded bg-violet-500/15 px-1 py-0.5 text-[7px] font-medium text-violet-400">
          __index
        </span>
        {itemFields.slice(0, 3).map((f) => (
          <span
            key={f}
            className="rounded bg-violet-500/10 px-1 py-0.5 text-[7px] font-medium text-violet-300/70"
          >
            {itemVar}.{f}
          </span>
        ))}
        {itemFields.length > 3 && (
          <span className="text-[7px] text-slate-500">+{itemFields.length - 3}</span>
        )}
      </div>
    </BaseNodeWrapper>
  );
}
