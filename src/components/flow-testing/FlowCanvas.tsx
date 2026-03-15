import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowBuilderStore, type FlowCanvasNode } from '../../stores/flowBuilderStore';
import { flowNodeTypes } from './nodes/nodeTypes';
import { flowEdgeTypes } from './edges/edgeTypes';
import { useDnD } from './DnDContext';
import { NodeContextMenu } from './NodeContextMenu';
import { DeleteNodeDialog } from './DeleteNodeDialog';
import type { FlowNodeType, FlowCanvasNodeData } from '../../types/flow';

const MINIMAP_COLORS: Record<string, string> = {
  auth: '#22c55e',
  request: '#3b82f6',
  condition: '#eab308',
  loop: '#a855f7',
  merge: '#6b7280',
  delay: '#9ca3af',
  script: '#f97316',
};

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
}

export function FlowCanvas() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    setViewport,
  } = useFlowBuilderStore();

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragType, setDragType] = useDnD();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Delete dialog state — stores node ids pending confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  // Store latest values in refs so native event listeners always see current state
  const dragTypeRef = useRef(dragType);
  dragTypeRef.current = dragType;
  const addNodeRef = useRef(addNode);
  addNodeRef.current = addNode;
  const screenToFlowPositionRef = useRef(screenToFlowPosition);
  screenToFlowPositionRef.current = screenToFlowPosition;
  const setDragTypeRef = useRef(setDragType);
  setDragTypeRef.current = setDragType;

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id);
      setContextMenu(null);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode]);

  // ── Intercept node removal to show confirmation dialog ─────────────────
  // All other node changes (position, select, dimensions) pass through.
  // When ReactFlow fires a "remove" change (Delete key), we intercept it
  // and show our confirmation dialog instead of removing immediately.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removeChanges = changes.filter((c) => c.type === 'remove');
      const otherChanges = changes.filter((c) => c.type !== 'remove');

      // Apply non-remove changes immediately
      if (otherChanges.length > 0) {
        onNodesChange(otherChanges as any);
      }

      // If there are remove changes, show confirmation dialog
      if (removeChanges.length > 0) {
        const idsToRemove = removeChanges.map((c) => (c as any).id as string);
        const storeNodes = useFlowBuilderStore.getState().nodes;
        const names = idsToRemove
          .map((id) => {
            const n = storeNodes.find((node) => node.id === id);
            const d = n?.data as unknown as FlowCanvasNodeData | undefined;
            return d?.label || d?.nodeType || 'Node';
          })
          .join(', ');

        setDeleteTarget({ ids: idsToRemove, label: names });
      }
    },
    [onNodesChange],
  );

  // ── Right-click context menu on nodes ──────────────────────────────────
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      const data = node.data as unknown as FlowCanvasNodeData;
      selectNode(node.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeLabel: data.label || data.nodeType,
      });
    },
    [selectNode],
  );

  const handleContextDelete = useCallback(() => {
    if (!contextMenu) return;
    setDeleteTarget({ ids: [contextMenu.nodeId], label: contextMenu.nodeLabel });
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextDuplicate = useCallback(() => {
    if (!contextMenu) return;
    const store = useFlowBuilderStore.getState();
    const sourceNode = store.nodes.find((n) => n.id === contextMenu.nodeId) as FlowCanvasNode | undefined;
    if (!sourceNode) return;
    const data = sourceNode.data as unknown as FlowCanvasNodeData;
    const newId = crypto.randomUUID();
    const newNode: FlowCanvasNode = {
      id: newId,
      type: sourceNode.type,
      position: { x: sourceNode.position.x + 40, y: sourceNode.position.y + 40 },
      data: {
        ...structuredClone(sourceNode.data),
        label: `${data.label} (copy)`,
        status: undefined,
        durationMs: undefined,
        error: undefined,
      },
    };
    useFlowBuilderStore.setState((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newId,
      isDirty: true,
    }));
    setContextMenu(null);
  }, [contextMenu]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const idsSet = new Set(deleteTarget.ids);
    const store = useFlowBuilderStore.getState();
    useFlowBuilderStore.setState({
      nodes: store.nodes.filter((n) => !idsSet.has(n.id)),
      edges: store.edges.filter((e) => !idsSet.has(e.source) && !idsSet.has(e.target)),
      selectedNodeId: store.selectedNodeId && idsSet.has(store.selectedNodeId) ? null : store.selectedNodeId,
      isDirty: true,
    });
    setDeleteTarget(null);
  }, [deleteTarget]);

  // ── Drag-and-drop from palette ────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const type =
        dragTypeRef.current ||
        (event.dataTransfer?.getData('application/flow-node-type') as FlowNodeType);
      if (!type) return;

      const position = screenToFlowPositionRef.current({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeRef.current(type, position);
      setDragTypeRef.current(null);
    };

    el.addEventListener('dragover', handleDragOver, { capture: true });
    el.addEventListener('drop', handleDrop, { capture: true });

    return () => {
      el.removeEventListener('dragover', handleDragOver, { capture: true });
      el.removeEventListener('drop', handleDrop, { capture: true });
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="h-full flex-1"
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        nodeTypes={flowNodeTypes as any}
        edgeTypes={flowEdgeTypes as any}
        onNodesChange={handleNodesChange as any}
        onEdgesChange={onEdgesChange as any}
        onConnect={onConnect as any}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onMoveEnd={(_event: any, vp: any) => setViewport(vp)}
        defaultViewport={viewport}
        fitView={nodes.length > 0}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
        className="bg-[rgba(var(--bg-900),0.97)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.06)" />
        <Controls
          showInteractive={false}
          className="!border-white/10 !bg-[rgba(var(--bg-800),0.8)] [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:!fill-slate-400"
        />
        <MiniMap
          nodeColor={(node: any) => MINIMAP_COLORS[node.type || ''] || '#6b7280'}
          maskColor="rgba(0,0,0,0.5)"
          className="!border-white/10 !bg-[rgba(var(--bg-800),0.8)]"
        />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeLabel={contextMenu.nodeLabel}
          onDelete={handleContextDelete}
          onDuplicate={handleContextDuplicate}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteNodeDialog
          nodeName={deleteTarget.label}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
