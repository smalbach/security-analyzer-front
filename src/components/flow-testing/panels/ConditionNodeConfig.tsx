import { ConfigField, ConfigInput, ConfigSelect } from './ConfigField';

interface ConditionNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ConditionNodeConfig({ config, onChange }: ConditionNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });

  return (
    <div className="space-y-3">
      <ConfigField
        label="Expression"
        help="A template expression referencing upstream node values. For example: {{auth.token}}, {{request_1.statusCode}}, {{request_1.body.data.length}}. The expression is evaluated against the flow context at runtime."
      >
        <ConfigInput
          value={String(config.expression || '')}
          onChange={(v) => update('expression', v)}
          placeholder="{{auth.token}} or {{request_1.statusCode}}"
          mono
        />
      </ConfigField>

      <ConfigField
        label="Operator"
        help="How to compare the expression result with the expected value. 'exists' / 'not_exists' ignore the value field."
      >
        <ConfigSelect
          value={String(config.operator || 'equals')}
          onChange={(v) => update('operator', v)}
          options={[
            { value: 'equals', label: 'Equals' },
            { value: 'not_equals', label: 'Not equals' },
            { value: 'contains', label: 'Contains' },
            { value: 'greater_than', label: 'Greater than' },
            { value: 'less_than', label: 'Less than' },
            { value: 'exists', label: 'Exists' },
            { value: 'not_exists', label: 'Not exists' },
          ]}
        />
      </ConfigField>

      <ConfigField
        label="Value"
        help="The expected value to compare against. Not required for 'exists' / 'not_exists' operators."
      >
        <ConfigInput
          value={String(config.value || '')}
          onChange={(v) => update('value', v)}
          placeholder="Expected value"
        />
      </ConfigField>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2 text-[10px] text-amber-300/80">
        <strong>Branching:</strong> The TRUE branch exits from the <span className="font-semibold text-emerald-400">right handle</span> (green).
        The FALSE branch exits from the <span className="font-semibold text-red-400">bottom handle</span> (red).
        Connect downstream nodes to the appropriate handle.
      </div>
    </div>
  );
}
