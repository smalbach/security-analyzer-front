import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { useNodeAliasMap } from '../../../hooks/useNodeAliasMap';
import { HelpTooltip } from '../../ui/HelpTooltip';
import { ScriptEditor } from '../../endpoint-editor/ScriptEditor';
import { AuthNodeConfig } from './AuthNodeConfig';
import { RequestNodeConfig } from './RequestNodeConfig';
import { ConditionNodeConfig } from './ConditionNodeConfig';
import { LoopNodeConfig } from './LoopNodeConfig';
import { ScriptNodeConfig } from './ScriptNodeConfig';
import { MergeNodeConfig } from './MergeNodeConfig';
import { DelayNodeConfig } from './DelayNodeConfig';
import { AssertionList } from './AssertionList';
import { ExtractorList } from './ExtractorList';
import { ConfigField, ConfigSelect } from './ConfigField';
import type { FlowCanvasNodeData } from '../../../types/flow';

interface NodeConfigPanelProps {
  projectId: string;
}

const TABS = ['config', 'scripts', 'assertions', 'extractors'] as const;
type Tab = (typeof TABS)[number];

const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const STORAGE_KEY = 'asa-config-panel-width';
const DEFAULT_WIDTH = 320;

/** Maps node type → which optional tabs to show */
function getVisibleTabs(nodeType: string): Set<Tab> {
  const visible = new Set<Tab>(['config'] as Tab[]);
  if (nodeType === 'request' || nodeType === 'auth') visible.add('scripts');
  if (nodeType === 'request') visible.add('assertions');
  if (nodeType === 'request' || nodeType === 'auth') visible.add('extractors');
  return visible;
}

/** Renders the correct config component for a given node type */
function NodeTypeConfig({
  nodeType,
  config,
  onChange,
  projectId,
}: {
  nodeType: string;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  projectId: string;
}) {
  switch (nodeType) {
    case 'auth':      return <AuthNodeConfig config={config} onChange={onChange} projectId={projectId} />;
    case 'request':   return <RequestNodeConfig config={config} onChange={onChange} projectId={projectId} />;
    case 'condition':  return <ConditionNodeConfig config={config} onChange={onChange} projectId={projectId} />;
    case 'loop':      return <LoopNodeConfig config={config} onChange={onChange} projectId={projectId} />;
    case 'merge':     return <MergeNodeConfig config={config} onChange={onChange} />;
    case 'delay':     return <DelayNodeConfig config={config} onChange={onChange} />;
    case 'script':    return <ScriptNodeConfig config={config} onChange={onChange} projectId={projectId} />;
    default:          return null;
  }
}

function useResizableWidth() {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH ? parsed : DEFAULT_WIDTH;
  });

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Panel is on the right, so dragging left (decreasing clientX) increases width
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Persist on release
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { width, onMouseDown };
}

export function NodeConfigPanel({ projectId }: NodeConfigPanelProps) {
  const { selectedNodeId, nodes, updateNodeConfig, updateNodeData, configPanelTab, setConfigPanelTab } =
    useFlowBuilderStore();
  const { width: panelWidth, onMouseDown: startResize } = useResizableWidth();
  const { replaceUuidsWithLabels, hasUuidExpressions } = useNodeAliasMap();
  const migratedNodeRef = useRef<string>('');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Auto-migrate: convert UUID-based template expressions to label-based aliases
  // This runs once when a node is selected and its config contains UUIDs
  useEffect(() => {
    if (!selectedNode?.id || migratedNodeRef.current === selectedNode.id) return;
    const config = (selectedNode.data as unknown as FlowCanvasNodeData).config as Record<string, unknown>;
    const configStr = JSON.stringify(config);
    if (hasUuidExpressions(configStr)) {
      const migrated = replaceUuidsWithLabels(configStr);
      if (migrated !== configStr) {
        try {
          const newConfig = JSON.parse(migrated);
          updateNodeConfig(selectedNode.id, newConfig);
        } catch { /* ignore parse errors */ }
      }
    }
    migratedNodeRef.current = selectedNode.id;
  }, [selectedNode?.id, selectedNode?.data, hasUuidExpressions, replaceUuidsWithLabels, updateNodeConfig]);

  if (!selectedNode) {
    return (
      <div
        className="flex items-center justify-center border-l border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.4)] text-xs text-slate-500"
        style={{ width: panelWidth }}
      >
        Select a node to configure
      </div>
    );
  }

  const nodeData = selectedNode.data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as Record<string, unknown>;
  const visibleTabs = getVisibleTabs(nodeData.nodeType);

  const handleConfigChange = (newConfig: Record<string, unknown>) => updateNodeConfig(selectedNode.id, newConfig);
  const handleLabelChange = (newLabel: string) => {
    const oldLabel = String(nodeData.label || '');
    updateNodeData(selectedNode.id, { label: newLabel });

    // Propagate label change: update all downstream node configs that reference the old label
    if (oldLabel && oldLabel !== newLabel) {
      const { nodes: allNodes, updateNodeConfig: updateConfig } = useFlowBuilderStore.getState();
      const oldPattern = `{{${oldLabel}.`;
      const newPattern = `{{${newLabel}.`;
      for (const n of allNodes) {
        if (n.id === selectedNode.id) continue;
        const nConfig = (n.data as unknown as FlowCanvasNodeData).config as Record<string, unknown>;
        const configStr = JSON.stringify(nConfig);
        if (configStr.includes(oldPattern)) {
          const updated = JSON.parse(configStr.replaceAll(oldPattern, newPattern));
          updateConfig(n.id, updated);
        }
      }
    }
  };
  const handleOnErrorChange = (onError: string) => updateNodeData(selectedNode.id, { onError: onError as 'stop' | 'continue' | 'error_branch' });

  return (
    <div
      className="relative flex flex-col overflow-hidden border-l border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.5)] backdrop-blur-xl"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors hover:bg-[rgba(var(--accent-400),0.3)]"
        onMouseDown={startResize}
      />

      {/* Header */}
      <div className="border-b border-white/5 px-3 py-2">
        <input
          type="text"
          value={nodeData.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
        />
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {nodeData.nodeType} node
          <span className="select-all font-mono text-[9px] normal-case tracking-normal text-slate-600" title={selectedNode.id}>
            #{selectedNode.id.slice(0, 6)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {TABS.filter((tab) => visibleTabs.has(tab)).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setConfigPanelTab(tab)}
            className={cn(
              'flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition',
              configPanelTab === tab
                ? 'border-b-2 border-[rgb(var(--accent-400))] text-slate-200'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {configPanelTab === 'config' && (
          <>
            <NodeTypeConfig nodeType={nodeData.nodeType} config={config} onChange={handleConfigChange} projectId={projectId} />

            {/* Error handling — shared by all node types */}
            <ConfigField
              label="On Error"
              help="Controls what happens when this node fails. 'Stop' halts the flow, 'Continue' skips to the next node, 'Error branch' routes to an error output handle."
              className="mt-4 border-t border-white/5 pt-3"
            >
              <ConfigSelect
                value={nodeData.onError}
                onChange={handleOnErrorChange}
                options={[
                  { value: 'stop', label: 'Stop execution' },
                  { value: 'continue', label: 'Continue to next' },
                  { value: 'error_branch', label: 'Error branch' },
                ]}
              />
            </ConfigField>
          </>
        )}

        {configPanelTab === 'scripts' && (
          <div className="space-y-4">
            <ConfigField
              label="Pre-Request Script"
              help="Runs before the HTTP request. Use flow.variables.set(key, val) to prepare data, or flow.environment.get(key) to read env variables."
            >
              <ScriptEditor
                value={nodeData.preScript || ''}
                onChange={(v) => updateNodeData(selectedNode.id, { preScript: v || null })}
                placeholder="// Runs before the request&#10;flow.variables.set('key', 'value');"
                minHeight="120px"
              />
            </ConfigField>

            <ConfigField
              label="Post-Response Script (Tests)"
              help="Runs after the response. Use flow.test(name, fn) for assertions, flow.expect(val).to.equal(expected) for checks, flow.response for status/body."
            >
              <ScriptEditor
                value={nodeData.postScript || ''}
                onChange={(v) => updateNodeData(selectedNode.id, { postScript: v || null })}
                placeholder={'// Runs after the response\nflow.test("Status 200", () => {\n  flow.expect(flow.response.statusCode).to.equal(200);\n});'}
                minHeight="120px"
              />
            </ConfigField>
          </div>
        )}

        {configPanelTab === 'assertions' && (
          <>
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Visual assertion builder</span>
              <HelpTooltip content="Add assertions to validate API responses. Check status codes, headers, JSONPath values, response times, and more. Each assertion can be error (fail) or warning severity." position="top" />
            </div>
            <AssertionList config={config} onChange={handleConfigChange} />
          </>
        )}

        {configPanelTab === 'extractors' && (
          <>
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Extract values to pass downstream</span>
              <HelpTooltip content="Extractors capture values from the response and make them available to downstream nodes via {{nodeId.extractorName}} template syntax." position="top" />
            </div>
            <ExtractorList config={config} onChange={handleConfigChange} />
          </>
        )}
      </div>
    </div>
  );
}
