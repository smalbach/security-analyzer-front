import { ConfigField, ConfigSelect } from './ConfigField';

interface MergeNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function MergeNodeConfig({ config, onChange }: MergeNodeConfigProps) {
  return (
    <div className="space-y-3">
      <ConfigField
        label="Strategy"
        help="'Wait for all' waits until every incoming branch completes before continuing. 'Wait for first' continues as soon as any one branch finishes (useful for race-condition testing)."
      >
        <ConfigSelect
          value={String(config.strategy || 'waitAll')}
          onChange={(v) => onChange({ ...config, strategy: v })}
          options={[
            { value: 'waitAll', label: 'Wait for all branches' },
            { value: 'waitFirst', label: 'Wait for first branch' },
          ]}
        />
      </ConfigField>

      <div className="rounded-lg border border-slate-500/20 bg-slate-500/[0.05] p-2 text-[10px] text-slate-300/80">
        <strong>How it works:</strong> Connect multiple upstream nodes to this merge node.
        It will combine their extracted values into a single context, making all upstream data
        available to downstream nodes. Great for parallel request patterns like{' '}
        <code className="rounded bg-white/5 px-1 text-slate-400">auth → [reqA, reqB] → merge → final</code>.
      </div>
    </div>
  );
}
