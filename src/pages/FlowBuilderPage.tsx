import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import { toast } from '../lib/toast';
import { flowNodeToCanvasNode, flowEdgeToCanvasEdge } from '../lib/flowCanvasAdapters';
import { validateFlow, type FlowValidationError } from '../lib/flowValidation';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';
import { useFlowExecutionStream } from '../hooks/useFlowExecutionStream';
import { useFlowActions } from '../hooks/useFlowActions';
import { FlowCanvas } from '../components/flow-testing/FlowCanvas';
import { FlowToolbar } from '../components/flow-testing/FlowToolbar';
import { FlowNodePalette } from '../components/flow-testing/FlowNodePalette';
import { DnDProvider } from '../components/flow-testing/DnDContext';
import { NodeConfigPanel } from '../components/flow-testing/panels/NodeConfigPanel';
import { ExecutionTimeline } from '../components/flow-testing/execution/ExecutionTimeline';
import { ExecutionReport } from '../components/flow-testing/execution/ExecutionReport';
import { ValidationErrorsPanel } from '../components/flow-testing/ValidationErrorsPanel';
import { useSessionTokenStore } from '../stores/sessionTokenStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import type { FlowNodeType } from '../types/flow';
import type { ProjectEnvironment } from '../types/environments';

function FlowBuilderContent() {
  const { projectId, flowId } = useParams<{ projectId: string; flowId: string }>();
  const { api } = useAuth();
  const apiBaseUrl: string = (api as any).baseUrl ?? '';

  const setSessionToken = useSessionTokenStore((s) => s.setToken);
  const invalidateEnvCache = useEnvironmentStore((s) => s.invalidate);

  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<FlowValidationError[]>([]);

  const {
    flowName, isDirty, isExecuting, executionId, viewport,
    loadFlow, addNode,
    setNodeStatus, setNodeRetrying, setIsExecuting, setExecutionSummary, setNodeResult,
    setShowExecutionTimeline, setShowExecutionReport, setFullExecutionData, addLoopIteration, clearLoopIterations,
  } = useFlowBuilderStore();

  const { saving, handleSave, handleRun: rawHandleRun, handleCancel } = useFlowActions({
    projectId, flowId,
  });

  // ── Persist environment selection to flow definition ──────────────────
  const handleEnvironmentChange = useCallback(async (envId: string | null) => {
    setSelectedEnvironmentId(envId);
    if (projectId && flowId) {
      try {
        await api.updateFlow(projectId, flowId, { environmentId: envId || undefined });
      } catch {
        // non-critical — will be saved on next full save
      }
    }
  }, [projectId, flowId, api]);

  // ── Fetch full execution data (with requestSnapshot/responseData) ─────
  const fetchFullExecutionReport = useCallback(async (execId: string) => {
    if (!projectId || !flowId) return;
    // Show report immediately using WS data while we fetch full data
    setShowExecutionReport(true);
    setShowExecutionTimeline(false);
    // Small delay to let backend finish persisting node execution results
    await new Promise((r) => setTimeout(r, 800));
    try {
      const full = await api.getFlowExecution(projectId, flowId, execId);
      setFullExecutionData(full);
    } catch {
      // Report still works with WS data — just missing requestSnapshot/responseData
    }
  }, [projectId, flowId, api, setFullExecutionData, setShowExecutionReport, setShowExecutionTimeline]);

  // ── Validated run — check config before executing ──────────────────────
  const handleRun = useCallback(async () => {
    const currentNodes = useFlowBuilderStore.getState().nodes;
    const currentEdges = useFlowBuilderStore.getState().edges;
    const errors = validateFlow(currentNodes, currentEdges);

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(`${errors.length} validation error${errors.length > 1 ? 's' : ''} — check the panel below`);
      return;
    }

    setValidationErrors([]);
    clearLoopIterations();
    await rawHandleRun();
  }, [rawHandleRun, clearLoopIterations]);

  // ── Load flow on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !flowId) return;
    (async () => {
      try {
        const flow = await api.getFlow(projectId, flowId);
        const canvasNodes = (flow.nodes || []).map(flowNodeToCanvasNode);
        const canvasEdges = (flow.edges || []).map(flowEdgeToCanvasEdge);
        loadFlow(flowId, flow.name, canvasNodes, canvasEdges, flow.viewport || undefined, flow.globalVariables);
        if (flow.environmentId) setSelectedEnvironmentId(flow.environmentId);
      } catch (err) {
        if (!isUnauthorizedError(err)) toast.error('Failed to load flow');
      }
    })();
  }, [projectId, flowId, api, loadFlow]);

  // ── Load environments ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const envs = await api.getEnvironments(projectId);
        setEnvironments(envs);
        if (!selectedEnvironmentId) {
          const active = envs.find((e) => e.isActive);
          if (active) setSelectedEnvironmentId(active.id);
        }
      } catch {
        // environments are optional
      }
    })();
  }, [projectId, api]);

  // ── WebSocket execution stream ────────────────────────────────────────────
  useFlowExecutionStream({
    baseUrl: apiBaseUrl,
    executionId: executionId || '',
    enabled: isExecuting && !!executionId,
    onNodeStarted: (e) => {
      setNodeStatus(e.nodeId, 'running');
      // Animate incoming edges to the running node (additive — don't clear other running nodes' edges)
      const state = useFlowBuilderStore.getState();
      useFlowBuilderStore.setState({
        edges: state.edges.map((edge) => ({
          ...edge,
          data: { ...edge.data, animated: edge.data?.animated || edge.target === e.nodeId },
        })),
      });
    },
    onNodeCompleted: (e) => {
      const status = e.status as 'success' | 'warning' | 'error';
      setNodeStatus(e.nodeId, status);
      setNodeResult(e.nodeId, {
        id: '', executionId: e.executionId, nodeId: e.nodeId, iteration: 0, status,
        startedAt: null, completedAt: null, retryCount: 0, createdAt: new Date().toISOString(),
        durationMs: e.durationMs ?? null,
        requestSnapshot: e.requestSnapshot ?? null,
        responseData: e.responseData ?? null,
        extractedValues: e.extractedValues ?? null,
        schemaValidation: e.schemaValidation ?? null,
        assertionResults: e.assertionResults ?? null,
        scriptOutput: e.scriptOutput ?? null,
        error: e.error ?? null,
        errorSource: e.errorSource ?? null,
      });
      // Capture token from environment updates (e.g. pm.environment.set("token", ...))
      if (e.environmentUpdates && projectId) {
        const token = e.environmentUpdates['token'];
        if (token && typeof token === 'string') {
          setSessionToken(projectId, token);
        }
        // Invalidate env cache so FloatingEnvButton refreshes from DB
        invalidateEnvCache(projectId);
      }
      // Also capture token from auth node extractedValues
      if (e.extractedValues?.token && projectId) {
        const token = String(e.extractedValues.token);
        setSessionToken(projectId, token);
        invalidateEnvCache(projectId);
      }
      // Clear edge animation for completed node
      const state = useFlowBuilderStore.getState();
      useFlowBuilderStore.setState({
        edges: state.edges.map((edge) => ({
          ...edge,
          data: { ...edge.data, animated: edge.data?.animated && edge.target !== e.nodeId },
        })),
      });
    },
    onNodeFailed: (e) => {
      if (!e.willRetry) {
        setNodeStatus(e.nodeId, 'error');
        setNodeResult(e.nodeId, {
          id: '', executionId: e.executionId, nodeId: e.nodeId, iteration: 0, status: 'error',
          startedAt: null, completedAt: null, retryCount: 0, createdAt: new Date().toISOString(),
          durationMs: null,
          requestSnapshot: e.requestSnapshot ?? null,
          responseData: e.responseData ?? null,
          extractedValues: null,
          schemaValidation: null, assertionResults: null, scriptOutput: null,
          error: e.error,
          errorSource: e.errorSource ?? null,
        });
        // Clear edge animation for failed node
        const state = useFlowBuilderStore.getState();
        useFlowBuilderStore.setState({
          edges: state.edges.map((edge) => ({
            ...edge,
            data: { ...edge.data, animated: edge.data?.animated && edge.target !== e.nodeId },
          })),
        });
      }
    },
    onNodeRetrying: (e) => setNodeRetrying(e.nodeId, e.attempt, e.maxRetries),
    onNodeSkipped: (e) => {
      setNodeStatus(e.nodeId, 'skipped');
      setNodeResult(e.nodeId, {
        id: '', executionId: e.executionId, nodeId: e.nodeId, iteration: 0, status: 'skipped',
        startedAt: null, completedAt: null, retryCount: 0, createdAt: new Date().toISOString(),
        durationMs: null, requestSnapshot: null, responseData: null, extractedValues: null,
        schemaValidation: null, assertionResults: null, scriptOutput: null,
        error: e.reason || 'Skipped',
      });
    },
    onLoopIteration: (e) => {
      addLoopIteration(e.loopNodeId, { index: e.index, total: e.total, item: e.item });
    },
    onExecutionCompleted: (e) => {
      setIsExecuting(false);
      setExecutionSummary(e.summary);
      // Clear all edge animations
      const state = useFlowBuilderStore.getState();
      useFlowBuilderStore.setState({
        edges: state.edges.map((edge) => ({ ...edge, data: { ...edge.data, animated: false } })),
      });
      if (e.summary.errors > 0) {
        toast.error(`Execution finished with ${e.summary.errors} failed node(s) — see report for details`);
      } else if (e.summary.warnings > 0) {
        toast.warning(`Execution completed with ${e.summary.warnings} warning(s)`);
      } else {
        toast.success('Flow execution completed successfully');
      }
      fetchFullExecutionReport(e.executionId);
    },
    onExecutionFailed: (e) => {
      setIsExecuting(false);
      // Clear all edge animations
      const state = useFlowBuilderStore.getState();
      useFlowBuilderStore.setState({
        edges: state.edges.map((edge) => ({ ...edge, data: { ...edge.data, animated: false } })),
      });
      toast.error(`Execution error: ${e.error}`);
      if (e.executionId) fetchFullExecutionReport(e.executionId);
    },
    onExecutionCancelled: () => {
      setIsExecuting(false);
      // Clear all edge animations
      const state = useFlowBuilderStore.getState();
      useFlowBuilderStore.setState({
        edges: state.edges.map((edge) => ({ ...edge, data: { ...edge.data, animated: false } })),
      });
      toast.info('Execution cancelled');
    },
  });

  // ── Add node from palette ─────────────────────────────────────────────────
  const handleAddNode = useCallback(
    (type: FlowNodeType) => {
      const x = -viewport.x / viewport.zoom + 400;
      const y = -viewport.y / viewport.zoom + 200 + Math.random() * 100;
      addNode(type, { x, y });
    },
    [addNode, viewport],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleRun(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleRun]);

  return (
    <div className="flow-builder-root flex h-full flex-col bg-[rgba(var(--bg-900),0.97)]">
      <FlowToolbar
        flowName={flowName}
        isDirty={isDirty}
        isExecuting={isExecuting}
        onSave={handleSave}
        onRun={handleRun}
        onCancel={handleCancel}
        saving={saving}
        environments={environments}
        selectedEnvironmentId={selectedEnvironmentId}
        onEnvironmentChange={handleEnvironmentChange}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <FlowNodePalette onAddNode={handleAddNode} />
        <FlowCanvas />
        <NodeConfigPanel projectId={projectId || ''} />
        <ExecutionTimeline />
        <ExecutionReport />
        {validationErrors.length > 0 && (
          <ValidationErrorsPanel
            errors={validationErrors}
            onClose={() => setValidationErrors([])}
          />
        )}
      </div>
    </div>
  );
}

export function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <FlowBuilderContent />
      </DnDProvider>
    </ReactFlowProvider>
  );
}
