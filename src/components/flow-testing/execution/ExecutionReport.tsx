import { useState, useMemo, useEffect } from 'react';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { diagnoseError, type ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import type { FlowCanvasNodeData, FlowNodeExecution, FlowNodeStatus } from '../../../types/flow';
import { Modal } from '../../ui/Modal';
import { ReportSummaryHeader } from './ReportSummaryHeader';
import { ReportNodeCard } from './ReportNodeCard';

export function ExecutionReport() {
  const {
    showExecutionReport,
    showFullScreenReport,
    fullExecutionData,
    executionSummary,
    nodes,
    nodeStatuses,
    nodeResults,
    loopIterations,
    selectNode,
    setConfigPanelTab,
    setShowExecutionReport,
    setShowExecutionTimeline,
    setShowFullScreenReport,
  } = useFlowBuilderStore();

  // Merge API data (has requestSnapshot/responseData) with WS data (always available)
  const { nodeExecMap, allDiagnoses } = useMemo(() => {
    const map: Record<string, FlowNodeExecution> = {};

    // Start with WS-collected results (always available, but missing requestSnapshot/responseData)
    for (const [nodeId, result] of Object.entries(nodeResults)) {
      map[nodeId] = result;
    }

    // Overlay with API-fetched results (has requestSnapshot/responseData)
    if (fullExecutionData?.nodeExecutions) {
      for (const ne of fullExecutionData.nodeExecutions) {
        // Prefer the API version if it has more data, or if it's an error
        const existing = map[ne.nodeId];
        if (!existing || ne.requestSnapshot || ne.responseData || ne.status === 'error' || ne.status === 'warning') {
          map[ne.nodeId] = ne;
        }
      }
    }

    const diagnoses: ErrorDiagnosis[] = [];
    for (const node of nodes) {
      const exec = map[node.id];
      const status = nodeStatuses[node.id];
      const hasError = exec?.error && (exec.status === 'error' || exec.status === 'warning' || status === 'error' || status === 'warning');
      if (hasError) {
        const data = node.data as unknown as FlowCanvasNodeData;
        const d = diagnoseError(
          exec.error!,
          data.nodeType,
          data.config || {},
          exec.responseData,
          exec.requestSnapshot,
        );
        diagnoses.push(d);
      }
    }

    return { nodeExecMap: map, allDiagnoses: diagnoses };
  }, [fullExecutionData, nodeResults, nodes, nodeStatuses]);

  // Build the list of renderable node cards
  const renderableNodes = useMemo(() => {
    const result: Array<{
      id: string;
      label: string;
      nodeType: string;
      config: Record<string, unknown>;
      status: FlowNodeStatus;
      exec: FlowNodeExecution | null;
    }> = [];

    // Primary source: canvas nodes + their statuses
    for (const node of nodes) {
      const status: FlowNodeStatus = nodeStatuses[node.id] || 'pending';
      if (status === 'pending') continue;
      const data = node.data as unknown as FlowCanvasNodeData;
      result.push({
        id: node.id,
        label: data?.label || 'Unknown Node',
        nodeType: data?.nodeType || 'request',
        config: data?.config || {},
        status,
        exec: nodeExecMap[node.id] || null,
      });
    }

    // Fallback: if no canvas nodes matched, try building from API execution data
    if (result.length === 0 && fullExecutionData?.nodeExecutions) {
      for (const ne of fullExecutionData.nodeExecutions) {
        // Try to find matching canvas node for label/config
        const canvasNode = nodes.find(n => n.id === ne.nodeId);
        const data = canvasNode?.data as unknown as FlowCanvasNodeData | undefined;
        result.push({
          id: ne.nodeId,
          label: data?.label || `Node ${ne.nodeId.substring(0, 8)}`,
          nodeType: data?.nodeType || 'request',
          config: data?.config || {},
          status: (ne.status as FlowNodeStatus) || 'error',
          exec: ne,
        });
      }
    }

    // Second fallback: build from nodeResults (WS data)
    if (result.length === 0) {
      for (const [nodeId, exec] of Object.entries(nodeResults)) {
        const canvasNode = nodes.find(n => n.id === nodeId);
        const data = canvasNode?.data as unknown as FlowCanvasNodeData | undefined;
        result.push({
          id: nodeId,
          label: data?.label || `Node ${nodeId.substring(0, 8)}`,
          nodeType: data?.nodeType || 'request',
          config: data?.config || {},
          status: (exec.status as FlowNodeStatus) || (nodeStatuses[nodeId] as FlowNodeStatus) || 'error',
          exec,
        });
      }
    }

    return result;
  }, [nodes, nodeStatuses, nodeExecMap, fullExecutionData, nodeResults]);

  // Auto-expand: expand ALL executed nodes so user always sees details
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showExecutionReport) return;
    const initial = new Set<string>();
    for (const rn of renderableNodes) {
      // Expand all nodes — user wants to see all details
      initial.add(rn.id);
    }
    setExpandedNodes(initial);
  }, [showExecutionReport, fullExecutionData, renderableNodes]);

  if (!showExecutionReport) return null;

  // Need at least WS data or API data to show anything
  const hasAnyData = Object.keys(nodeResults).length > 0 || Object.keys(nodeStatuses).length > 0 || fullExecutionData?.nodeExecutions?.length;
  if (!hasAnyData) return null;

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(renderableNodes.map(n => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleFixThis = (nodeId: string, tab?: string) => {
    selectNode(nodeId);
    setConfigPanelTab((tab || 'config') as any);
    setShowExecutionReport(false);
  };

  const handleShowTimeline = () => {
    setShowExecutionReport(false);
    setShowExecutionTimeline(true);
  };

  // Determine overall status from multiple sources
  let overallStatus: 'success' | 'warning' | 'error' = 'success';

  // 1. Check executionSummary (from execution-completed event)
  if (executionSummary) {
    if (executionSummary.errors > 0) overallStatus = 'error';
    else if (executionSummary.warnings > 0) overallStatus = 'warning';
  }
  // 2. Check fullExecutionData status (from API)
  else if (fullExecutionData) {
    if (fullExecutionData.status === 'failed') overallStatus = 'error';
    else if (fullExecutionData.status === 'completed_with_warnings') overallStatus = 'warning';
  }
  // 3. Fallback: check individual node statuses from WS
  if (overallStatus === 'success') {
    const statuses = Object.values(nodeStatuses);
    if (statuses.some((s) => s === 'error')) overallStatus = 'error';
    else if (statuses.some((s) => s === 'warning')) overallStatus = 'warning';
  }

  // Build summary from fullExecutionData if executionSummary is missing
  const effectiveSummary = executionSummary || fullExecutionData?.summary || null;

  // Compute HTTP status distribution from nodeExecMap
  const httpStatusDistribution: Record<number, number> = {};
  for (const exec of Object.values(nodeExecMap)) {
    if (exec?.responseData?.statusCode) {
      const code = exec.responseData.statusCode;
      httpStatusDistribution[code] = (httpStatusDistribution[code] || 0) + 1;
    }
  }

  const accentBorder = overallStatus === 'error'
    ? 'border-t-2 border-t-red-500'
    : overallStatus === 'warning'
      ? 'border-t-2 border-t-amber-500'
      : 'border-t-2 border-t-emerald-500';

  const allExpanded = renderableNodes.length > 0 && renderableNodes.every(n => expandedNodes.has(n.id));

  const reportContent = (isFullScreen: boolean) => (
    <>
      <ReportSummaryHeader
        summary={effectiveSummary}
        diagnoses={allDiagnoses}
        overallStatus={overallStatus}
        onClose={isFullScreen ? () => setShowFullScreenReport(false) : () => setShowExecutionReport(false)}
        onShowTimeline={handleShowTimeline}
        httpStatusDistribution={httpStatusDistribution}
        onOpenFullScreen={isFullScreen ? undefined : () => setShowFullScreenReport(true)}
      />

      {/* Node details section header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Node Execution Details
        </span>
        <span className="text-[10px] text-slate-600">
          ({renderableNodes.length} node{renderableNodes.length !== 1 ? 's' : ''})
        </span>
        <div className="flex-1" />
        {renderableNodes.length > 1 && (
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {/* Node cards */}
      <div className="space-y-2 px-3 pb-4">
        {renderableNodes.length > 0 ? (
          renderableNodes.map((rn, index) => {
            // Build diagnosis for error/warning nodes
            let diagnosis: ErrorDiagnosis | null = null;
            if (rn.exec?.error && (rn.exec.status === 'error' || rn.exec.status === 'warning' || rn.status === 'error' || rn.status === 'warning')) {
              diagnosis = diagnoseError(
                rn.exec.error,
                rn.nodeType as any,
                rn.config,
                rn.exec.responseData,
                rn.exec.requestSnapshot,
              );
            }

            return (
              <ReportNodeCard
                key={rn.id}
                nodeLabel={rn.label}
                nodeType={rn.nodeType}
                nodeConfig={rn.config}
                status={rn.status}
                execution={rn.exec}
                diagnosis={diagnosis}
                isExpanded={expandedNodes.has(rn.id)}
                onToggle={() => toggleExpand(rn.id)}
                onFixThis={(tab) => handleFixThis(rn.id, tab)}
                executionOrder={index + 1}
                loopIterations={rn.nodeType === 'loop' ? loopIterations[rn.id] : undefined}
              />
            );
          })
        ) : (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
            <div className="text-sm text-slate-400">No node execution details available</div>
            <div className="mt-1 text-[11px] text-slate-600">
              Node data may not have been captured. Try running the flow again.
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Bottom panel */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 max-h-[70vh] overflow-y-auto ${accentBorder} bg-[rgba(var(--bg-900),0.97)] backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.4)] animate-[slideUp_0.3s_ease-out]`}
        style={{ minHeight: '180px' }}
      >
        {reportContent(false)}
      </div>

      {/* Fullscreen modal */}
      {showFullScreenReport && (
        <Modal
          open={showFullScreenReport}
          title="Execution Report"
          size="full"
          onClose={() => setShowFullScreenReport(false)}
          bodyClassName="p-0"
        >
          {reportContent(true)}
        </Modal>
      )}
    </>
  );
}
