import { useState, useMemo, useEffect } from 'react';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { diagnoseError, type ErrorDiagnosis } from '../../../lib/errorDiagnosis';
import type { FlowCanvasNodeData, FlowNodeExecution, FlowNodeStatus } from '../../../types/flow';
import { ReportSummaryHeader } from './ReportSummaryHeader';
import { ReportNodeCard } from './ReportNodeCard';

export function ExecutionReport() {
  const {
    showExecutionReport,
    fullExecutionData,
    executionSummary,
    nodes,
    nodeStatuses,
    nodeResults,
    selectNode,
    setConfigPanelTab,
    setShowExecutionReport,
    setShowExecutionTimeline,
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
      const hasError = exec?.error && (exec.status === 'error' || status === 'error');
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

  // Auto-expand nodes with errors/warnings — recalculate when execution data changes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showExecutionReport) return;
    const initial = new Set<string>();
    for (const node of nodes) {
      const status = nodeStatuses[node.id];
      if (status === 'error' || status === 'warning') {
        initial.add(node.id);
      }
    }
    // If nothing has errors, expand all nodes so user sees something
    if (initial.size === 0) {
      for (const node of nodes) {
        if (nodeStatuses[node.id] && nodeStatuses[node.id] !== 'pending') {
          initial.add(node.id);
        }
      }
    }
    setExpandedNodes(initial);
  }, [showExecutionReport, fullExecutionData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showExecutionReport) return null;

  // Need at least WS data or API data to show anything
  const hasAnyData = Object.keys(nodeResults).length > 0 || fullExecutionData?.nodeExecutions?.length;
  if (!hasAnyData) return null;

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[70vh] overflow-y-auto border-t border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.97)] backdrop-blur-xl">
      <ReportSummaryHeader
        summary={effectiveSummary}
        diagnoses={allDiagnoses}
        overallStatus={overallStatus}
        onClose={() => setShowExecutionReport(false)}
        onShowTimeline={handleShowTimeline}
      />

      {/* Node cards */}
      <div className="space-y-1.5 p-3">
        {nodes.map((node) => {
          const status: FlowNodeStatus = nodeStatuses[node.id] || 'pending';
          if (status === 'pending') return null; // Node wasn't executed

          const data = node.data as unknown as FlowCanvasNodeData;
          const exec = nodeExecMap[node.id] || null;

          // Build diagnosis for this specific node
          let diagnosis: ErrorDiagnosis | null = null;
          if (exec?.error && (exec.status === 'error' || status === 'error')) {
            diagnosis = diagnoseError(
              exec.error,
              data.nodeType,
              data.config || {},
              exec.responseData,
              exec.requestSnapshot,
            );
          }

          return (
            <ReportNodeCard
              key={node.id}
              nodeLabel={data.label}
              nodeType={data.nodeType}
              nodeConfig={data.config || {}}
              status={status}
              execution={exec}
              diagnosis={diagnosis}
              isExpanded={expandedNodes.has(node.id)}
              onToggle={() => toggleExpand(node.id)}
              onFixThis={(tab) => handleFixThis(node.id, tab)}
            />
          );
        })}
      </div>
    </div>
  );
}
