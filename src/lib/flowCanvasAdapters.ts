/**
 * Adapter functions to convert between backend FlowNode/FlowEdge entities
 * and the @xyflow/react canvas node/edge format.
 */
import type { FlowCanvasNode, FlowCanvasEdge } from '../stores/flowBuilderStore';
import type { FlowNode, FlowEdge, FlowCanvasNodeData, CanvasNode, CanvasEdge } from '../types/flow';

/** Backend FlowNode → canvas node for @xyflow/react */
export function flowNodeToCanvasNode(node: FlowNode): FlowCanvasNode {
  return {
    id: node.id,
    type: node.nodeType,
    position: { x: node.positionX, y: node.positionY },
    data: {
      nodeType: node.nodeType,
      label: node.label || node.nodeType,
      config: node.config,
      preScript: node.preScript,
      postScript: node.postScript,
      retryConfig: node.retryConfig,
      onError: node.onError,
    },
  };
}

/** Backend FlowEdge → canvas edge for @xyflow/react */
export function flowEdgeToCanvasEdge(edge: FlowEdge): FlowCanvasEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    label: edge.label || undefined,
    type: 'animated',
  };
}

/** Canvas nodes → save DTO for backend */
export function canvasNodesToSaveDto(nodes: FlowCanvasNode[]): CanvasNode[] {
  return nodes.map((n) => {
    const d = n.data as unknown as FlowCanvasNodeData;
    return {
      id: n.id,
      nodeType: d.nodeType,
      label: d.label,
      positionX: n.position.x,
      positionY: n.position.y,
      config: d.config,
      preScript: d.preScript || undefined,
      postScript: d.postScript || undefined,
      retryConfig: d.retryConfig || undefined,
      onError: d.onError,
      sortOrder: 0,
    };
  });
}

/** Canvas edges → save DTO for backend */
export function canvasEdgesToSaveDto(edges: FlowCanvasEdge[]): CanvasEdge[] {
  return edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
    label: typeof e.label === 'string' ? e.label : undefined,
  }));
}
