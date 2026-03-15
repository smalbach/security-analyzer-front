import { create } from 'zustand';
import type { Node, Edge, Viewport, OnNodesChange, OnEdgesChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type {
  FlowCanvasNodeData,
  FlowNodeType,
  FlowNodeStatus,
  FlowNodeExecution,
  FlowExecution,
  FlowExecutionSummary,
} from '../types/flow';

export type FlowCanvasNode = Node<FlowCanvasNodeData>;
export type FlowCanvasEdge = Edge;

interface FlowBuilderState {
  // Canvas
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  viewport: Viewport;
  selectedNodeId: string | null;

  // Flow metadata
  flowId: string | null;
  flowName: string;

  // Execution
  executionId: string | null;
  batchId: string | null;
  nodeStatuses: Record<string, FlowNodeStatus>;
  nodeResults: Record<string, FlowNodeExecution>;
  nodeRetries: Record<string, { attempt: number; maxRetries: number }>;
  isExecuting: boolean;
  executionSummary: FlowExecutionSummary | null;

  // UI
  isDirty: boolean;
  configPanelTab: 'config' | 'scripts' | 'assertions' | 'extractors';
  showExecutionTimeline: boolean;
  showExecutionReport: boolean;
  fullExecutionData: FlowExecution | null;
  stepDelayMs: number;

  // Actions - Canvas
  setNodes: (nodes: FlowCanvasNode[]) => void;
  setEdges: (edges: FlowCanvasEdge[]) => void;
  onNodesChange: OnNodesChange<FlowCanvasNode>;
  onEdgesChange: OnEdgesChange<FlowCanvasEdge>;
  onConnect: (connection: Connection) => void;
  setViewport: (viewport: Viewport) => void;

  // Actions - Node management
  addNode: (type: FlowNodeType, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowCanvasNodeData>) => void;
  selectNode: (nodeId: string | null) => void;
  deleteSelectedNode: () => void;

  // Actions - Flow
  setFlowId: (id: string | null) => void;
  setFlowName: (name: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setConfigPanelTab: (tab: 'config' | 'scripts' | 'assertions' | 'extractors') => void;

  // Actions - Execution
  setExecutionId: (id: string | null) => void;
  setBatchId: (id: string | null) => void;
  setNodeStatus: (nodeId: string, status: FlowNodeStatus) => void;
  setNodeRetrying: (nodeId: string, attempt: number, maxRetries: number) => void;
  setNodeResult: (nodeId: string, result: FlowNodeExecution) => void;
  setIsExecuting: (executing: boolean) => void;
  setExecutionSummary: (summary: FlowExecutionSummary | null) => void;
  setShowExecutionTimeline: (show: boolean) => void;
  setShowExecutionReport: (show: boolean) => void;
  setFullExecutionData: (data: FlowExecution | null) => void;
  setStepDelayMs: (ms: number) => void;
  resetExecution: () => void;

  // Actions - Load
  loadFlow: (
    flowId: string,
    name: string,
    nodes: FlowCanvasNode[],
    edges: FlowCanvasEdge[],
    viewport?: Viewport,
  ) => void;
  resetStore: () => void;

  // Derived
  getSelectedNode: () => FlowCanvasNode | undefined;
  getUpstreamNodeIds: (nodeId: string) => string[];
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const NODE_DEFAULTS: Record<FlowNodeType, { label: string; config: Record<string, unknown> }> = {
  auth: {
    label: 'Auth',
    config: { loginUrl: '', method: 'POST', headers: {}, body: {}, tokenPath: 'token' },
  },
  request: {
    label: 'Request',
    config: { url: '', method: 'GET', headers: {}, body: null, queryParams: {} },
  },
  condition: {
    label: 'Condition',
    config: { expression: '', operator: 'equals', value: '' },
  },
  loop: {
    label: 'Loop',
    config: { sourceExpression: '', itemVariable: 'item' },
  },
  merge: {
    label: 'Merge',
    config: { strategy: 'waitAll' },
  },
  delay: {
    label: 'Delay',
    config: { delayMs: 1000 },
  },
  script: {
    label: 'Script',
    config: { code: '' },
  },
};

export const useFlowBuilderStore = create<FlowBuilderState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  selectedNodeId: null,
  flowId: null,
  flowName: '',
  executionId: null,
  batchId: null,
  nodeStatuses: {},
  nodeResults: {},
  nodeRetries: {},
  isExecuting: false,
  executionSummary: null,
  isDirty: false,
  configPanelTab: 'config',
  showExecutionTimeline: false,
  showExecutionReport: false,
  fullExecutionData: null,
  stepDelayMs: 0,

  // Canvas actions
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge({ ...connection, id: crypto.randomUUID() }, state.edges),
      isDirty: true,
    }));
  },

  setViewport: (viewport) => set({ viewport }),

  // Node management
  addNode: (type, position) => {
    const defaults = NODE_DEFAULTS[type];
    const id = crypto.randomUUID();
    const newNode: FlowCanvasNode = {
      id,
      type: type,
      position,
      data: {
        nodeType: type,
        label: defaults.label,
        config: { ...defaults.config },
        preScript: null,
        postScript: null,
        retryConfig: null,
        onError: 'stop',
      },
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
      isDirty: true,
    }));
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
      ),
      isDirty: true,
    }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  deleteSelectedNode: () => {
    const { selectedNodeId } = get();
    if (!selectedNodeId) return;
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== selectedNodeId),
      edges: state.edges.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
      ),
      selectedNodeId: null,
      isDirty: true,
    }));
  },

  // Flow actions
  setFlowId: (id) => set({ flowId: id }),
  setFlowName: (name) => set({ flowName: name }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setConfigPanelTab: (tab) => set({ configPanelTab: tab }),

  // Execution actions
  setExecutionId: (id) => set({ executionId: id }),
  setBatchId: (id) => set({ batchId: id }),

  setNodeStatus: (nodeId, status) => {
    set((state) => {
      const nodeStatuses = { ...state.nodeStatuses, [nodeId]: status };
      const nodes = state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, status } } : n,
      );
      return { nodeStatuses, nodes };
    });
  },

  setNodeRetrying: (nodeId, attempt, maxRetries) => {
    set((state) => ({
      nodeRetries: { ...state.nodeRetries, [nodeId]: { attempt, maxRetries } },
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: 'retrying' },
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, status: 'retrying' as const, retryAttempt: attempt, maxRetries } }
          : n,
      ),
    }));
  },

  setNodeResult: (nodeId, result) => {
    set((state) => ({
      nodeResults: { ...state.nodeResults, [nodeId]: result },
    }));
  },

  setIsExecuting: (executing) => set({ isExecuting: executing }),
  setExecutionSummary: (summary) => set({ executionSummary: summary }),
  setShowExecutionTimeline: (show) => set({ showExecutionTimeline: show }),
  setShowExecutionReport: (show) => set({ showExecutionReport: show }),
  setFullExecutionData: (data) => set({ fullExecutionData: data }),
  setStepDelayMs: (ms) => set({ stepDelayMs: ms }),

  resetExecution: () => {
    set((state) => ({
      executionId: null,
      batchId: null,
      nodeStatuses: {},
      nodeResults: {},
      nodeRetries: {},
      isExecuting: false,
      executionSummary: null,
      showExecutionReport: false,
      fullExecutionData: null,
      nodes: state.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: undefined,
          durationMs: undefined,
          retryAttempt: undefined,
          maxRetries: undefined,
          assertionResults: undefined,
          error: undefined,
        },
      })),
      // Clear edge animations
      edges: state.edges.map((e) => ({
        ...e,
        data: { ...e.data, animated: false },
      })),
    }));
  },

  // Load flow
  loadFlow: (flowId, name, nodes, edges, viewport) => {
    set({
      flowId,
      flowName: name,
      nodes,
      edges,
      viewport: viewport || DEFAULT_VIEWPORT,
      selectedNodeId: null,
      isDirty: false,
      executionId: null,
      batchId: null,
      nodeStatuses: {},
      nodeResults: {},
      nodeRetries: {},
      isExecuting: false,
      executionSummary: null,
    });
  },

  resetStore: () => {
    set({
      nodes: [],
      edges: [],
      viewport: DEFAULT_VIEWPORT,
      selectedNodeId: null,
      flowId: null,
      flowName: '',
      executionId: null,
      batchId: null,
      nodeStatuses: {},
      nodeResults: {},
      nodeRetries: {},
      isExecuting: false,
      executionSummary: null,
      isDirty: false,
      configPanelTab: 'config',
      showExecutionTimeline: false,
      showExecutionReport: false,
      fullExecutionData: null,
      stepDelayMs: 0,
    });
  },

  // Derived
  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return nodes.find((n) => n.id === selectedNodeId);
  },

  getUpstreamNodeIds: (nodeId) => {
    const { edges } = get();
    return edges.filter((e) => e.target === nodeId).map((e) => e.source);
  },
}));
