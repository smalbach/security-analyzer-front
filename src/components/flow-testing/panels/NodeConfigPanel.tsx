import { cn } from '../../../lib/cn';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
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
    case 'condition':  return <ConditionNodeConfig config={config} onChange={onChange} />;
    case 'loop':      return <LoopNodeConfig config={config} onChange={onChange} />;
    case 'merge':     return <MergeNodeConfig config={config} onChange={onChange} />;
    case 'delay':     return <DelayNodeConfig config={config} onChange={onChange} />;
    case 'script':    return <ScriptNodeConfig config={config} onChange={onChange} />;
    default:          return null;
  }
}

export function NodeConfigPanel({ projectId }: NodeConfigPanelProps) {
  const { selectedNodeId, nodes, updateNodeConfig, updateNodeData, configPanelTab, setConfigPanelTab } =
    useFlowBuilderStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) {
    return (
      <div className="flex w-[320px] items-center justify-center border-l border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.4)] text-xs text-slate-500">
        Select a node to configure
      </div>
    );
  }

  const nodeData = selectedNode.data as unknown as FlowCanvasNodeData;
  const config = nodeData.config as Record<string, unknown>;
  const visibleTabs = getVisibleTabs(nodeData.nodeType);

  const handleConfigChange = (newConfig: Record<string, unknown>) => updateNodeConfig(selectedNode.id, newConfig);
  const handleLabelChange = (label: string) => updateNodeData(selectedNode.id, { label });
  const handleOnErrorChange = (onError: string) => updateNodeData(selectedNode.id, { onError: onError as 'stop' | 'continue' | 'error_branch' });

  return (
    <div className="flex w-[320px] flex-col overflow-hidden border-l border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.5)] backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/5 px-3 py-2">
        <input
          type="text"
          value={nodeData.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
        />
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {nodeData.nodeType} node
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
