import { ConfigField, ConfigInput } from './ConfigField';
import { TemplateInput } from './TemplateInput';
import { AvailableVariables } from './AvailableVariables';
import { GroupedDataSourceSelect } from './GroupedDataSourceSelect';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import { useUpstreamDataSources } from '../../../hooks/useUpstreamDataSources';

interface LoopNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

export function LoopNodeConfig({ config, onChange, projectId }: LoopNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });
  const completions = useTemplateCompletions(projectId);
  const dataSources = useUpstreamDataSources(projectId);

  // Check if there are any array fields available
  const hasArrayFields = dataSources.some((ds) =>
    ds.fields.some((f) => f.fieldType === 'array'),
  );

  return (
    <div className="space-y-3">
      <AvailableVariables projectId={projectId} />

      {/* Visual array source picker */}
      <ConfigField
        label="Array Source"
        help="Select an array field from an upstream node to iterate over. Only array-type fields are shown here. If no arrays appear, define an array field in an upstream node's Response Schema and generate extractors."
      >
        <GroupedDataSourceSelect
          dataSources={dataSources}
          value={String(config.sourceExpression || '')}
          onChange={(v) => update('sourceExpression', v)}
          filterFieldType="array"
          placeholder="Select an array to iterate over..."
          emptyMessage="No array fields found. Define arrays in upstream Response Schemas and generate extractors."
        />
      </ConfigField>

      {/* Manual fallback / all sources */}
      {!hasArrayFields && (
        <ConfigField
          label="Source Expression (manual)"
          help="If no array fields appear above, type a template expression pointing to an array. Type {{ to browse all available variables."
        >
          <TemplateInput
            value={String(config.sourceExpression || '')}
            onChange={(v) => update('sourceExpression', v)}
            completions={completions}
            placeholder="Type {{ to select a source array..."
          />
        </ConfigField>
      )}

      {/* Show the resolved expression for clarity */}
      {!!config.sourceExpression && (
        <div className="rounded bg-white/[0.03] px-2 py-1">
          <span className="text-[9px] text-slate-500">Source expression: </span>
          <span className="font-mono text-[10px] text-slate-300">{String(config.sourceExpression)}</span>
        </div>
      )}

      <ConfigField
        label="Item Variable"
        help="Variable name for the current iteration item. Downstream nodes can reference it as {{loopNodeId.item}} (or whatever name you set here)."
      >
        <ConfigInput
          value={String(config.itemVariable || 'item')}
          onChange={(v) => update('itemVariable', v)}
          placeholder="item"
          mono
        />
      </ConfigField>

      <ConfigField
        label="Max Iterations"
        help="Optional safety limit. Set to 0 or leave empty for no limit. Useful to prevent infinite loops on large datasets."
      >
        <ConfigInput
          value={String(config.maxIterations || '')}
          onChange={(v) => update('maxIterations', v ? Number(v) : undefined)}
          placeholder="No limit"
          type="number"
        />
      </ConfigField>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-2 text-[10px] text-violet-300/80">
        <strong>Loop handles:</strong>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-violet-300/60">
          <li><span className="text-violet-400">Loop Item</span> (right) — executes once per item in the array</li>
          <li><span className="text-slate-400">Loop Done</span> (bottom) — executes after all iterations complete</li>
        </ul>
      </div>
    </div>
  );
}
