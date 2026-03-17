import { useMemo } from 'react';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';
import type { FlowNodeExtractor, FlowNodeType } from '../types/flow';
import type { Edge } from '@xyflow/react';
import { jsonSchemaToFields, schemaFieldsToExtractors } from '../components/flow-testing/panels/SchemaFieldRow';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DataSourceField {
  /** Variable name (e.g. "userId", "__token", "item") */
  name: string;
  /** Full template expression (e.g. "{{nodeId.userId}}") */
  templateExpression: string;
  /** Where this field comes from */
  origin: 'extractor' | 'schema' | 'loop' | 'auth';
  /** JSONPath expression for extractor/schema fields */
  jsonPath?: string;
  /** Schema-inferred field type (for filtering, e.g. arrays for loops) */
  fieldType?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
}

export interface DataSource {
  nodeId: string;
  nodeLabel: string;
  nodeType: FlowNodeType;
  fields: DataSourceField[];
}

// ─── BFS upstream traversal (exported for reuse) ────────────────────────────

export function collectAllUpstream(nodeId: string, edges: Edge[]): Set<string> {
  const visited = new Set<string>();
  const queue = edges.filter((e) => e.target === nodeId).map((e) => e.source);

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

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Returns structured data sources from all upstream nodes of the currently
 * selected node. Includes extractors, schema-derived fields, loop variables,
 * and auth tokens. Used by GroupedDataSourceSelect, condition builder, and
 * loop source picker.
 */
export function useUpstreamDataSources(_projectId: string): DataSource[] {
  const nodes = useFlowBuilderStore((s) => s.nodes);
  const edges = useFlowBuilderStore((s) => s.edges);
  const selectedNodeId = useFlowBuilderStore((s) => s.selectedNodeId);

  return useMemo(() => {
    if (!selectedNodeId) return [];
    const upstreamIds = collectAllUpstream(selectedNodeId, edges);
    const sources: DataSource[] = [];

    for (const upId of upstreamIds) {
      const node = nodes.find((n) => n.id === upId);
      if (!node) continue;
      const nodeLabel = String(node.data.label || upId.slice(0, 8));
      const nodeType = node.data.nodeType as FlowNodeType;
      const config = node.data.config as Record<string, unknown>;
      const fields: DataSourceField[] = [];

      // Use label as alias in template expressions for readability
      // Backend resolves both UUID and label references
      const nodeRef = nodeLabel;

      // 1. Explicit extractors
      const extractors = (config.extractors || []) as FlowNodeExtractor[];
      for (const ext of extractors) {
        fields.push({
          name: ext.name,
          templateExpression: `{{${nodeRef}.${ext.name}}}`,
          origin: 'extractor',
          jsonPath: ext.expression,
        });
      }

      // 2. Schema-derived fields (only those NOT already covered by extractors)
      if (config.responseSchema && typeof config.responseSchema === 'object') {
        const schemaFields = jsonSchemaToFields(config.responseSchema);
        const suggested = schemaFieldsToExtractors(schemaFields);
        const existingNames = new Set(extractors.map((e) => e.name));

        // Also derive fieldType from the original schema fields for filtering
        const schemaFieldTypeMap = new Map<string, string>();
        const buildTypeMap = (
          sFields: ReturnType<typeof jsonSchemaToFields>,
          prefix: string,
        ) => {
          for (const sf of sFields) {
            if (!sf.name.trim()) continue;
            schemaFieldTypeMap.set(sf.name, sf.type);
            if (sf.type === 'object' && sf.children?.length) {
              buildTypeMap(sf.children, `${prefix}.${sf.name}`);
            }
            if (sf.type === 'array' && sf.items?.type === 'object' && sf.items.children?.length) {
              for (const child of sf.items.children) {
                schemaFieldTypeMap.set(`${sf.name}_${child.name}`, child.type);
              }
            }
          }
        };
        buildTypeMap(schemaFields, '$');

        for (const s of suggested) {
          if (existingNames.has(s.name)) {
            // Already an extractor — add fieldType info to the existing field
            const existing = fields.find((f) => f.name === s.name && f.origin === 'extractor');
            if (existing && !existing.fieldType) {
              existing.fieldType = schemaFieldTypeMap.get(s.name) as DataSourceField['fieldType'];
            }
            continue;
          }
          fields.push({
            name: s.name,
            templateExpression: `{{${nodeRef}.${s.name}}}`,
            origin: 'schema',
            jsonPath: s.expression,
            fieldType: schemaFieldTypeMap.get(s.name) as DataSourceField['fieldType'],
          });
        }
      }

      // 3. Auth token (implicit)
      if (nodeType === 'auth') {
        fields.push({
          name: '__token',
          templateExpression: `{{${nodeRef}.__token}}`,
          origin: 'auth',
        });
      }

      // 4. Loop item variables + sub-fields from source array schema
      if (nodeType === 'loop') {
        const itemVar = String(config.itemVariable || 'item');
        fields.push({
          name: itemVar,
          templateExpression: `{{${nodeRef}.${itemVar}}}`,
          origin: 'loop',
          fieldType: 'object',
        });
        fields.push({
          name: '__index',
          templateExpression: `{{${nodeRef}.__index}}`,
          origin: 'loop',
          fieldType: 'number',
        });

        // Derive item sub-fields from the source array's schema
        // e.g., if sourceExpression is "{{reqId.live}}" and live is array<{id, name}>
        // then expose: "item.id", "item.name"
        const sourceExpr = String(config.sourceExpression || '');
        const sourceMatch = sourceExpr.match(/^\{\{([^.]+)\.(.+)\}\}$/);
        if (sourceMatch) {
          const [, sourceNodeRef, sourceField] = sourceMatch;
          // Find source node by UUID or by label alias
          const sourceNode = nodes.find(
            (n) => n.id === sourceNodeRef || (n.data.label && String(n.data.label).toLowerCase() === sourceNodeRef.toLowerCase()),
          );
          if (sourceNode) {
            const sourceSchema = (sourceNode.data.config as Record<string, unknown>).responseSchema;
            if (sourceSchema && typeof sourceSchema === 'object') {
              const sFields = jsonSchemaToFields(sourceSchema);
              // Find the array field in the schema
              const findArrayField = (
                flds: ReturnType<typeof jsonSchemaToFields>,
                name: string,
              ): ReturnType<typeof jsonSchemaToFields>[0] | undefined => {
                for (const f of flds) {
                  if (f.name === name) return f;
                  // Check compound names like "live_subField"
                  if (f.type === 'object' && f.children?.length) {
                    const found = findArrayField(f.children, name);
                    if (found) return found;
                  }
                }
                return undefined;
              };
              const arrayField = findArrayField(sFields, sourceField);
              if (arrayField?.type === 'array' && arrayField.items?.type === 'object' && arrayField.items.children?.length) {
                for (const child of arrayField.items.children) {
                  if (!child.name.trim()) continue;
                  fields.push({
                    name: `${itemVar}.${child.name}`,
                    templateExpression: `{{${nodeRef}.${itemVar}.${child.name}}}`,
                    origin: 'loop',
                    fieldType: child.type as DataSourceField['fieldType'],
                  });
                }
              }
            }
          }
        }
      }

      if (fields.length > 0) {
        sources.push({ nodeId: upId, nodeLabel, nodeType, fields });
      }
    }

    return sources;
  }, [nodes, edges, selectedNodeId]);
}
