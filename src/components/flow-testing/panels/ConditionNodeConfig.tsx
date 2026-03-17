import { useState } from 'react';
import { ConfigField, ConfigSelect } from './ConfigField';
import { TemplateInput } from './TemplateInput';
import { AvailableVariables } from './AvailableVariables';
import { GroupedDataSourceSelect } from './GroupedDataSourceSelect';
import { useTemplateCompletions } from '../../../hooks/useTemplateCompletions';
import { useUpstreamDataSources } from '../../../hooks/useUpstreamDataSources';

interface ConditionNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Not equals (!=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater than (>)' },
  { value: 'less_than', label: 'Less than (<)' },
  { value: 'exists', label: 'Exists (not null)' },
  { value: 'not_exists', label: 'Not exists (null)' },
];

export function ConditionNodeConfig({ config, onChange, projectId }: ConditionNodeConfigProps) {
  const update = (field: string, value: unknown) => onChange({ ...config, [field]: value });
  const completions = useTemplateCompletions(projectId);
  const dataSources = useUpstreamDataSources(projectId);
  const [mode, setMode] = useState<'visual' | 'advanced'>('visual');

  const operator = String(config.operator || 'equals');
  const hideValue = operator === 'exists' || operator === 'not_exists';

  return (
    <div className="space-y-3">
      <AvailableVariables projectId={projectId} />

      {/* Mode toggle */}
      <div className="flex items-center gap-1">
        {(['visual', 'advanced'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
              mode === m
                ? 'bg-[rgba(var(--accent-400),0.15)] text-[rgb(var(--accent-400))]'
                : 'bg-white/5 text-slate-500 hover:text-slate-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'visual' ? (
        /* ─── Visual Builder ─────────────────────────────────── */
        <div className="space-y-3">
          <ConfigField
            label="Check this value"
            help="Select a field from an upstream node to evaluate. The dropdown shows all available extractors and schema fields from upstream nodes."
          >
            <GroupedDataSourceSelect
              dataSources={dataSources}
              value={String(config.expression || '')}
              onChange={(v) => update('expression', v)}
              placeholder="Select a field to check..."
              emptyMessage="No upstream data available. Add extractors or Response Schemas to upstream request nodes."
            />
          </ConfigField>

          <ConfigField
            label="Condition"
            help="How to compare the selected value. 'Exists' checks if the value is not null/undefined. 'Not exists' checks if it IS null/undefined."
          >
            <ConfigSelect
              value={operator}
              onChange={(v) => update('operator', v)}
              options={OPERATORS}
            />
          </ConfigField>

          {!hideValue && (
            <ConfigField
              label="Expected value"
              help="The value to compare against. Can be a literal (e.g. 'true', '200') or a variable reference (type {{ to browse)."
            >
              <TemplateInput
                value={String(config.value || '')}
                onChange={(v) => update('value', v)}
                completions={completions}
                placeholder="Expected value or type {{ for variables"
              />
            </ConfigField>
          )}
        </div>
      ) : (
        /* ─── Advanced Mode (raw template expressions) ───────── */
        <div className="space-y-3">
          <ConfigField
            label="Expression"
            help="A template expression referencing upstream node values. Type {{ to browse available variables. Example: {{request_1.statusCode}}, {{auth.__token}}."
          >
            <TemplateInput
              value={String(config.expression || '')}
              onChange={(v) => update('expression', v)}
              completions={completions}
              placeholder="Type {{ to select a variable..."
            />
          </ConfigField>

          <ConfigField
            label="Operator"
            help="How to compare the expression result with the expected value. 'exists' / 'not_exists' ignore the value field."
          >
            <ConfigSelect
              value={operator}
              onChange={(v) => update('operator', v)}
              options={OPERATORS}
            />
          </ConfigField>

          {!hideValue && (
            <ConfigField
              label="Value"
              help="The expected value to compare against. Supports {{variable}} templates. Not required for 'exists' / 'not_exists' operators."
            >
              <TemplateInput
                value={String(config.value || '')}
                onChange={(v) => update('value', v)}
                completions={completions}
                placeholder="Expected value or type {{ for variables"
              />
            </ConfigField>
          )}
        </div>
      )}

      {/* Branching info */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2 text-[10px] text-amber-300/80">
        <strong>Branching:</strong> The TRUE branch exits from the <span className="font-semibold text-emerald-400">right handle</span> (green).
        The FALSE branch exits from the <span className="font-semibold text-red-400">bottom handle</span> (red).
        Connect downstream nodes to the appropriate handle.
      </div>
    </div>
  );
}
