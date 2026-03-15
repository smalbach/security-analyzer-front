import { ConfigField, ConfigInput } from './ConfigField';

interface DelayNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function DelayNodeConfig({ config, onChange }: DelayNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });

  return (
    <div className="space-y-3">
      <ConfigField
        label="Delay (ms)"
        help="Fixed delay in milliseconds before the flow continues to the next node. Default: 1000ms (1 second)."
      >
        <ConfigInput
          value={String(config.delayMs || 1000)}
          onChange={(v) => update('delayMs', Number(v))}
          placeholder="1000"
          type="number"
        />
      </ConfigField>

      <ConfigField
        label="Dynamic Expression (optional)"
        help="Template expression that resolves to a number (ms) at runtime. If set, it overrides the fixed delay. Useful for respecting Retry-After headers: {{request_1.headers.retry-after}}."
      >
        <ConfigInput
          value={String(config.delayExpression || '')}
          onChange={(v) => update('delayExpression', v)}
          placeholder="{{request_1.headers.retry-after}}"
          mono
        />
      </ConfigField>

      <div className="rounded-lg border border-slate-500/20 bg-slate-500/[0.05] p-2 text-[10px] text-slate-300/80">
        <strong>Tip:</strong> Use delay nodes to simulate realistic user wait times between
        API calls, or to respect rate-limit headers from upstream responses.
      </div>
    </div>
  );
}
