import { useMemo } from 'react';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import type { FlowNodeExtractor } from '../types/flow';
import type { Edge } from '@xyflow/react';

export interface TemplateCompletion {
  /** Full template string to insert, e.g. "{{env.baseUrl}}" */
  label: string;
  /** Display text in the dropdown, e.g. "env.baseUrl" */
  displayLabel: string;
  /** Extra context shown beside the item, e.g. "Environment · https://..." */
  detail: string;
  /** Category for grouping/styling */
  type: 'env' | 'extractor' | 'var';
  /** Higher = appears first */
  boost: number;
}

/**
 * Collects all available template variable completions for the currently
 * selected node: environment variables, upstream node extractors, and
 * flow global variables.
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
      const extractors = (node.data.config.extractors || []) as FlowNodeExtractor[];

      for (const ext of extractors) {
        completions.push({
          label: `{{${upId}.${ext.name}}}`,
          displayLabel: `${nodeLabel}.${ext.name}`,
          detail: `Extractor (${ext.type || 'jsonpath'}) \u00B7 ${ext.expression}`,
          type: 'extractor',
          boost: 8,
        });
      }

      // Auth nodes implicitly produce __token
      if (node.data.nodeType === 'auth') {
        completions.push({
          label: `{{${upId}.__token}}`,
          displayLabel: `${nodeLabel}.__token`,
          detail: 'Auth token (auto-injected)',
          type: 'extractor',
          boost: 9,
        });
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

/** BFS to collect ALL upstream node IDs (not just direct parents). */
function collectAllUpstream(
  nodeId: string,
  edges: Edge[],
): Set<string> {
  const visited = new Set<string>();
  const queue = edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      if (e.target === current && !visited.has(e.source)) {
        queue.push(e.source);
      }
    }
  }

  return visited;
}
