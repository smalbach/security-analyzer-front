import type { KVPair } from './types';
import type { TemplateCompletion } from '../../hooks/useTemplateCompletions';
import { Button, Input } from '../ui';
import { TemplateInput } from '../flow-testing/panels/TemplateInput';

interface KeyValueTableProps {
  rows: KVPair[];
  onChange: (rows: KVPair[]) => void;
  templateCompletions?: TemplateCompletion[];
  compact?: boolean;
}

const EMPTY_ROW: KVPair = { key: '', value: '', enabled: true };

export function KeyValueTable({ rows, onChange, templateCompletions, compact }: KeyValueTableProps) {
  const addRow = () => onChange([...rows, { ...EMPTY_ROW }]);

  const updateRow = (index: number, patch: Partial<KVPair>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const inputClass = compact
    ? 'min-w-0 flex-1 rounded-lg px-1.5 py-1 font-mono text-[11px]'
    : 'min-w-0 flex-1 rounded-lg px-2.5 py-1.5 font-mono text-xs';

  const templateInputClass = compact
    ? 'w-full rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40 hover:bg-white/[0.07] font-mono'
    : undefined; // use default TemplateInput styles

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {rows.map((row, index) => (
        <div key={`kv-${index}`} className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => updateRow(index, { enabled: event.target.checked })}
            className="h-3.5 w-3.5 accent-tide-500 shrink-0"
          />
          <Input
            value={row.key}
            onChange={(event) => updateRow(index, { key: event.target.value })}
            placeholder="Key"
            className={inputClass}
          />
          {templateCompletions ? (
            <div className="min-w-0 flex-1">
              <TemplateInput
                value={row.value}
                onChange={(val) => updateRow(index, { value: val })}
                completions={templateCompletions}
                placeholder="Value"
                className={templateInputClass}
              />
            </div>
          ) : (
            <Input
              value={row.value}
              onChange={(event) => updateRow(index, { value: event.target.value })}
              placeholder="Value"
              className={inputClass}
            />
          )}
          <Button variant="ghost" size="xs" className="shrink-0 text-slate-500 hover:text-red-400" onClick={() => removeRow(index)}>
            x
          </Button>
        </div>
      ))}

      <Button variant="link" size="xs" onClick={addRow}>
        Add row
      </Button>
    </div>
  );
}
