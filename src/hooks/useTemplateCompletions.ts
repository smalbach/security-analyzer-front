import { useMemo } from 'react';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import type { FlowNodeExtractor } from '../types/flow';
import { collectAllUpstream } from './useUpstreamDataSources';
import { jsonSchemaToFields, schemaFieldsToExtractors } from '../components/flow-testing/panels/SchemaFieldRow';

export interface TemplateCompletion {
  /** Full template string to insert, e.g. "{{env.baseUrl}}" */
  label: string;
  /** Display text in the dropdown, e.g. "env.baseUrl" */
  displayLabel: string;
  /** Extra context shown beside the item, e.g. "Environment · https://..." */
  detail: string;
  /** Category for grouping/styling */
  type: 'env' | 'extractor' | 'var' | 'loop' | 'schema';
  /** Higher = appears first */
  boost: number;
  /** For 'schema' type: info needed to auto-create the extractor on the upstream node */
  suggestedExtractor?: {
    nodeId: string;
    name: string;
    expression: string;
  };
}

/**
 * Collects all available template variable completions for the currently
 * selected node: environment variables, upstream node extractors, schema-derived
 * fields, loop variables, and flow global variables.
 */
export function useTemplateCompletions(projectId: string): TemplateCompletion[] {
  const nodes = useFlowBuilderStore((s) => s.nodes);
  const edges = useFlowBuilderStore((s) => s.edges);
  const selectedNodeId = useFlowBuilderStore((s) => s.selectedNodeId);
  const globalVariables = useFlowBuilderStore((s) => s.globalVariables);
  const activeEnv = useEnvironmentStore((s) => s.getActiveEnv(projectId));

  return useMemo(() => {
    const completions: TemplateCompletion[] = [];
    if (!selectedNodeId) return completions;

    // 1. Environment variables
    if (activeEnv?.variables) {
      for (const v of activeEnv.variables) {
        if (!v.enabled) continue;
        const preview = v.sensitive
          ? '****'
          : v.currentValue || v.defaultValue || '(empty)';
        completions.push({
          label: `{{env.${v.key}}}`,
          displayLabel: `env.${v.key}`,
          detail: `Environment${v.sensitive ? ' \uD83D\uDD12' : ''} \u00B7 ${preview}`,
          type: 'env',
          boost: 10,
        });
      }
    }

    // 2. Upstream node extractors (recursive BFS)
    const upstreamIds = collectAllUpstream(selectedNodeId, edges);
    for (const upId of upstreamIds) {
      const node = nodes.find((n) => n.id === upId);
      if (!node) continue;
      const nodeLabel = node.data.label || upId.slice(0, 8);
      // Use label as alias for human-readable expressions (backend resolves both)
      const nodeRef = String(nodeLabel);
      const extractors = (node.data.config.extractors || []) as FlowNodeExtractor[];

      for (const ext of extractors) {
        completions.push({
          label: `{{${nodeRef}.${ext.name}}}`,
          displayLabel: `${nodeLabel}.${ext.name}`,
          detail: `Extractor (${ext.type || 'jsonpath'}) \u00B7 ${ext.expression}`,
          type: 'extractor',
          boost: 8,
        });
      }

      // Auth nodes implicitly produce __token
      if (node.data.nodeType === 'auth') {
        completions.push({
          label: `{{${nodeRef}.__token}}`,
          displayLabel: `${nodeLabel}.__token`,
          detail: 'Auth token (auto-injected)',
          type: 'extractor',
          boost: 9,
        });
      }

      // 2b. Schema-derived fields (not yet extracted)
      const schema = node.data.config.responseSchema;
      if (schema && typeof schema === 'object') {
        const schemaFields = jsonSchemaToFields(schema);
        const suggested = schemaFieldsToExtractors(schemaFields);
        const existingNames = new Set(extractors.map((e) => e.name));

        for (const s of suggested) {
          if (existingNames.has(s.name)) continue; // already has an extractor
          completions.push({
            label: `{{${nodeRef}.${s.name}}}`,
            displayLabel: `${nodeLabel}.${s.name}`,
            detail: `Schema field \u00B7 ${s.expression} \u00B7 click to auto-create extractor`,
            type: 'schema',
            boost: 4,
            suggestedExtractor: {
              nodeId: upId,
              name: s.name,
              expression: s.expression,
            },
          });
        }
      }
    }

    // 2c. Loop item variables + sub-fields from upstream loop nodes
    for (const upId of upstreamIds) {
      const node = nodes.find((n) => n.id === upId);
      if (!node || node.data.nodeType !== 'loop') continue;
      const loopConfig = node.data.config as Record<string, unknown>;
      const itemVar = String(loopConfig.itemVariable || 'item');
      const nodeLabel = node.data.label || upId.slice(0, 8);
      const nodeRef = String(nodeLabel);

      completions.push({
        label: `{{${nodeRef}.${itemVar}}}`,
        displayLabel: `${nodeLabel}.${itemVar}`,
        detail: 'Loop iteration item (full object)',
        type: 'loop',
        boost: 8,
      });

      completions.push({
        label: `{{${nodeRef}.__index}}`,
        displayLabel: `${nodeLabel}.__index`,
        detail: 'Loop iteration index (0-based)',
        type: 'loop',
        boost: 7,
      });

      // Derive sub-fields from the source array's schema
      const sourceExpr = String(loopConfig.sourceExpression || '');
      const sourceMatch = sourceExpr.match(/^\{\{([^.]+)\.(.+)\}\}$/);
      if (sourceMatch) {
        const [, sourceNodeRef, sourceField] = sourceMatch;
        // Find source node by label or by UUID
        const sourceNode = nodes.find(
          (n) => n.id === sourceNodeRef || (n.data.label && String(n.data.label).toLowerCase() === sourceNodeRef.toLowerCase()),
        );
        if (sourceNode) {
          const sourceSchema = (sourceNode.data.config as Record<string, unknown>).responseSchema;
          if (sourceSchema && typeof sourceSchema === 'object') {
            const sFields = jsonSchemaToFields(sourceSchema);
            const arrayField = sFields.find((f) => f.name === sourceField);
            if (arrayField?.type === 'array' && arrayField.items?.type === 'object' && arrayField.items.children?.length) {
              for (const child of arrayField.items.children) {
                if (!child.name.trim()) continue;
                completions.push({
                  label: `{{${nodeRef}.${itemVar}.${child.name}}}`,
                  displayLabel: `${nodeLabel}.${itemVar}.${child.name}`,
                  detail: `Loop item field · ${child.type}`,
                  type: 'loop',
                  boost: 7,
                });
              }
            }
          }
        }
      }
    }

    // 3. Flow global variables
    if (globalVariables) {
      for (const key of Object.keys(globalVariables)) {
        completions.push({
          label: `{{var.${key}}}`,
          displayLabel: `var.${key}`,
          detail: `Flow variable \u00B7 ${String(globalVariables[key] ?? '')}`,
          type: 'var',
          boost: 7,
        });
      }
    }

    return completions;
  }, [nodes, edges, selectedNodeId, activeEnv, globalVariables]);
}
