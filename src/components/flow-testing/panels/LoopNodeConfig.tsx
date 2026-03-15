import { ConfigField, ConfigInput } from './ConfigField';

interface LoopNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function LoopNodeConfig({ config, onChange }: LoopNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });

  return (
    <div className="space-y-3">
      <ConfigField
        label="Source Expression"
        help="Template expression pointing to an array from an upstream node's response. Example: {{request_1.body.data}} iterates over the 'data' array from request_1's response body."
      >
        <ConfigInput
          value={String(config.sourceExpression || '')}
          onChange={(v) => update('sourceExpression', v)}
          placeholder="{{request_1.body.data}}"
          mono
        />
      </ConfigField>

      <ConfigField
        label="Item Variable"
        help="Variable name for the current iteration item. Downstream nodes can reference it as {{loop.item}} (or whatever name you set here)."
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
