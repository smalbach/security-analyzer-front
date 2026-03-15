/**
 * Pre-run validation for flow nodes.
 * Returns a list of human-readable validation errors so the user
 * knows exactly what to fix before running the flow.
 */

import type { FlowCanvasNodeData, FlowNodeType } from '../types/flow';

export interface FlowValidationError {
  nodeId: string;
  nodeLabel: string;
  nodeType: FlowNodeType;
  field: string;
  message: string;
}

interface NodeLike {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

interface EdgeLike {
  source: string;
  target: string;
}

/** Validates a single node's config and returns errors */
function validateNode(node: NodeLike): FlowValidationError[] {
  const errors: FlowValidationError[] = [];
  const data = node.data as unknown as FlowCanvasNodeData;
  const config = (data.config || {}) as Record<string, unknown>;
  const nodeType = data.nodeType;
  const baseInfo = {
    nodeId: node.id,
    nodeLabel: data.label || nodeType,
    nodeType,
  };

  switch (nodeType) {
    case 'auth': {
      if (!config.loginUrl || (config.loginUrl as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'loginUrl', message: 'Login URL is required' });
      }
      if (!config.method) {
        errors.push({ ...baseInfo, field: 'method', message: 'HTTP method is required' });
      }
      if (!config.tokenPath || (config.tokenPath as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'tokenPath', message: 'Token path is required (e.g. "token" or "data.accessToken")' });
      }
      break;
    }

    case 'request': {
      if (!config.url || (config.url as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'url', message: 'Request URL is required' });
      }
      if (!config.method) {
        errors.push({ ...baseInfo, field: 'method', message: 'HTTP method is required' });
      }
      break;
    }

    case 'condition': {
      if (!config.expression || (config.expression as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'expression', message: 'Condition expression is required (e.g. "{{prev.status}}")' });
      }
      if (!config.operator) {
        errors.push({ ...baseInfo, field: 'operator', message: 'Comparison operator is required' });
      }
      // value can be empty string for "exists"/"not_exists" operators
      const needsValue = config.operator && !['exists', 'not_exists'].includes(config.operator as string);
      if (needsValue && (config.value === undefined || config.value === null || (config.value as string).toString().trim() === '')) {
        errors.push({ ...baseInfo, field: 'value', message: 'Comparison value is required for this operator' });
      }
      break;
    }

    case 'loop': {
      if (!config.sourceExpression || (config.sourceExpression as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'sourceExpression', message: 'Source expression is required (e.g. "{{prev.body.items}}")' });
      }
      if (!config.itemVariable || (config.itemVariable as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'itemVariable', message: 'Item variable name is required' });
      }
      break;
    }

    case 'script': {
      if (!config.code || (config.code as string).trim() === '') {
        errors.push({ ...baseInfo, field: 'code', message: 'Script code is required' });
      }
      break;
    }

    case 'delay': {
      const ms = Number(config.delayMs);
      if (isNaN(ms) || ms < 0) {
        errors.push({ ...baseInfo, field: 'delayMs', message: 'Delay must be a positive number in milliseconds' });
      }
      break;
    }

    case 'merge': {
      if (!config.strategy) {
        errors.push({ ...baseInfo, field: 'strategy', message: 'Merge strategy is required' });
      }
      break;
    }
  }

  return errors;
}

/** Validates the entire flow graph */
export function validateFlow(nodes: NodeLike[], edges: EdgeLike[]): FlowValidationError[] {
  const errors: FlowValidationError[] = [];

  // Must have at least one node
  if (nodes.length === 0) {
    return [{ nodeId: '', nodeLabel: 'Flow', nodeType: 'request', field: 'nodes', message: 'Flow has no nodes. Add at least one node to the canvas.' }];
  }

  // Validate each node's config
  for (const node of nodes) {
    errors.push(...validateNode(node));
  }

  // Check for disconnected nodes (no incoming or outgoing edges) — warning only for multi-node flows
  if (nodes.length > 1) {
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }
    for (const node of nodes) {
      if (!connectedIds.has(node.id)) {
        const data = node.data as unknown as FlowCanvasNodeData;
        errors.push({
          nodeId: node.id,
          nodeLabel: data.label || data.nodeType,
          nodeType: data.nodeType,
          field: 'connections',
          message: 'Node is not connected to any other node. Connect it or remove it.',
        });
      }
    }
  }

  return errors;
}
