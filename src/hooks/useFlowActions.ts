/**
 * Custom hook encapsulating flow save, run, and cancel actions.
 * Keeps FlowBuilderPage lean by moving orchestration logic here.
 */
import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import { toast } from '../lib/toast';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';
import { canvasNodesToSaveDto, canvasEdgesToSaveDto } from '../lib/flowCanvasAdapters';

interface UseFlowActionsArgs {
  projectId: string | undefined;
  flowId: string | undefined;
}

export function useFlowActions({ projectId, flowId }: UseFlowActionsArgs) {
  const { api } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    isDirty,
    nodes,
    edges,
    viewport,
    setIsDirty,
    setExecutionId,
    setIsExecuting,
    setShowExecutionTimeline,
    resetExecution,
  } = useFlowBuilderStore();

  const handleSave = useCallback(async () => {
    if (!projectId || !flowId) return;
    setSaving(true);
    try {
      await api.saveFlowCanvas(projectId, flowId, {
        nodes: canvasNodesToSaveDto(nodes),
        edges: canvasEdgesToSaveDto(edges),
        viewport,
      });
      setIsDirty(false);
      toast.success('Flow saved');
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to save flow');
    } finally {
      setSaving(false);
    }
  }, [projectId, flowId, api, nodes, edges, viewport, setIsDirty]);

  const handleRun = useCallback(async () => {
    if (!projectId || !flowId) return;
    if (isDirty) await handleSave();
    resetExecution();
    try {
      const { stepDelayMs } = useFlowBuilderStore.getState();
      const execution = await api.startFlowExecution(projectId, flowId, {
        ...(stepDelayMs > 0 && { stepDelayMs }),
      });
      setExecutionId(execution.id);
      setIsExecuting(true);
      setShowExecutionTimeline(true);
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to start execution');
    }
  }, [projectId, flowId, api, isDirty, handleSave, resetExecution, setExecutionId, setIsExecuting, setShowExecutionTimeline]);

  const handleCancel = useCallback(async () => {
    const { executionId } = useFlowBuilderStore.getState();
    if (!projectId || !flowId || !executionId) return;
    try {
      await api.cancelFlowExecution(projectId, flowId, executionId);
    } catch (err) {
      if (!isUnauthorizedError(err)) toast.error('Failed to cancel execution');
    }
  }, [projectId, flowId, api]);

  return { saving, handleSave, handleRun, handleCancel };
}
