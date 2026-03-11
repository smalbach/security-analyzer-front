import type { KVPair } from './types';
import { Button, Input } from '../ui';

interface KeyValueTableProps {
  rows: KVPair[];
  onChange: (rows: KVPair[]) => void;
}

const EMPTY_ROW: KVPair = { key: '', value: '', enabled: true };

export function KeyValueTable({ rows, onChange }: KeyValueTableProps) {
  const addRow = () => onChange([...rows, { ...EMPTY_ROW }]);

  const updateRow = (index: number, patch: Partial<KVPair>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <div key={`kv-${index}`} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => updateRow(index, { enabled: event.target.checked })}
            className="h-3.5 w-3.5 accent-tide-500"
          />
          <Input
            value={row.key}
            onChange={(event) => updateRow(index, { key: event.target.value })}
            placeholder="Key"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 font-mono text-xs"
          />
          <Input
            value={row.value}
            onChange={(event) => updateRow(index, { value: event.target.value })}
            placeholder="Value"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 font-mono text-xs"
          />
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
