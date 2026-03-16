import { useMemo } from 'react';
import { useFlowBuilderStore } from '../../../stores/flowBuilderStore';
import { CustomSelect } from '../../ui/CustomSelect';
import { TemplateInput } from './TemplateInput';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import type { FlowNodeExtractor } from '../../../types/flow';
import type { Edge } from '@xyflow/react';

interface VariableMappingEditorProps {
  mappings: Array<Record<string, unknown>>;
  onChange: (mappings: Array<Record<string, unknown>>) => void;
  projectId: string;
}

/** BFS to collect all upstream node IDs */
function collectAllUpstream(nodeId: string, edges: Edge[]): Set<string> {
  const visited = new Set<string>();
  const queue = edges.filter((e) => e.target === nodeId).map((e) => e.source);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      if (e.target === current && !visited.has(e.source)) {
        queue.push(e.source);
      }
    }
  }
  return visited;
}

export function VariableMappingEditor({ mappings, onChange, projectId }: VariableMappingEditorProps) {
  const nodes = useFlowBuilderStore((s) => s.nodes);
  const edges = useFlowBuilderStore((s) => s.edges);
  const selectedNodeId = useFlowBuilderStore((s) => s.selectedNodeId);
  const completions = useTemplateCompletions(projectId);

  // Upstream nodes with their extractors
  const upstreamNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const upstreamIds = collectAllUpstream(selectedNodeId, edges);
    const result: Array<{
      id: string;
      label: string;
      extractors: Array<{ name: string; expression: string; type: string }>;
    }> = [];

    for (const upId of upstreamIds) {
      const node = nodes.find((n) => n.id === upId);
      if (!node) continue;
      const nodeLabel = String(node.data.label || upId.slice(0, 8));
      const extractors: Array<{ name: string; expression: string; type: string }> =
        ((node.data.config?.extractors || []) as FlowNodeExtractor[]).map((ext) => ({
          name: ext.name,
          expression: ext.expression,
          type: ext.type || 'jsonpath',
        }));

      // Auth nodes implicitly produce __token
      if (node.data.nodeType === 'auth') {
        extractors.unshift({ name: '__token', expression: 'auto-injected', type: 'auth' });
      }

      result.push({ id: upId, label: nodeLabel, extractors });
    }
    return result;
  }, [selectedNodeId, nodes, edges]);

  const sourceNodeOptions = useMemo(
    () => upstreamNodes.map((n) => ({ value: n.id, label: n.label })),
    [upstreamNodes],
  );

  const getExtractorOptions = (sourceNodeId: string) => {
    const node = upstreamNodes.find((n) => n.id === sourceNodeId);
    if (!node) return [];
    return node.extractors.map((ext) => ({
      value: `{{${sourceNodeId}.${ext.name}}}`,
      label: `${ext.name} (${ext.type}: ${ext.expression})`,
    }));
  };

  const addMapping = () => {
    onChange([...mappings, { targetPath: '', sourceNodeId: '', sourceExpression: '' }]);
  };

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = mappings.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onChange(updated);
  };

  const removeMapping = (index: number) => {
    onChange(mappings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {mappings.map((m, i) => {
        const sourceNodeId = String(m.sourceNodeId || '');
        const sourceExpression = String(m.sourceExpression || '');
        const targetPath = String(m.targetPath || '');
        const extractorOptions = getExtractorOptions(sourceNodeId);

        return (
          <div key={i} className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-2">
            {/* Header with remove button */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Mapping {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeMapping(i)}
                className="text-xs text-red-400 transition hover:text-red-300"
              >
                &times;
              </button>
            </div>

            {/* Source Node */}
            <div>
              <label className="mb-0.5 block text-[9px] text-slate-500">Source Node</label>
              <CustomSelect
                value={sourceNodeId}
                onChange={(v) => {
                  updateMapping(i, 'sourceNodeId', v);
                  updateMapping(i, 'sourceExpression', ''); // reset expression on node change
                }}
                options={sourceNodeOptions}
                placeholder="Select upstream node..."
              />
            </div>

            {/* Source Value (extractor) */}
            <div>
              <label className="mb-0.5 block text-[9px] text-slate-500">Source Value</label>
              {sourceNodeId && extractorOptions.length > 0 ? (
                <CustomSelect
                  value={sourceExpression}
                  onChange={(v) => updateMapping(i, 'sourceExpression', v)}
                  options={extractorOptions}
                  placeholder="Select extractor..."
                />
              ) : (
                <TemplateInput
                  value={sourceExpression}
                  onChange={(v) => updateMapping(i, 'sourceExpression', v)}
                  completions={completions}
                  placeholder="{{nodeId.extractorName}}"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 font-mono text-[11px] text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40 hover:bg-white/[0.07]"
                />
              )}
            </div>

            {/* Arrow indicator */}
            <div className="flex items-center justify-center py-0.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-500">
                <path d="M7 3v8m0 0l-2.5-2.5M7 11l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Target Path */}
            <div>
              <label className="mb-0.5 block text-[9px] text-slate-500">Target Path</label>
              <TemplateInput
                value={targetPath}
                onChange={(v) => updateMapping(i, 'targetPath', v)}
                completions={completions}
                placeholder="e.g. body.userId, headers.Authorization"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 font-mono text-[11px] text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40 hover:bg-white/[0.07]"
              />
            </div>
          </div>
        );
      })}

      {/* Add mapping button */}
      <button
        type="button"
        onClick={addMapping}
        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/10"
      >
        + Add Mapping
      </button>

      {/* Empty state hint */}
      {mappings.length === 0 && upstreamNodes.length > 0 && (
        <p className="text-center text-[10px] text-slate-600">
          Map values from {upstreamNodes.length} upstream node{upstreamNodes.length > 1 ? 's' : ''} into this request
        </p>
      )}
    </div>
  );
}
