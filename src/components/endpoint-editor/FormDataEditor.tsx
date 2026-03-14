import { Input } from '../ui';
import type { FormDataRow } from './types';

interface FormDataEditorProps {
  rows: FormDataRow[];
  onChange: (rows: FormDataRow[]) => void;
}

export function FormDataEditor({ rows, onChange }: FormDataEditorProps) {
  const addRow = () => {
    onChange([...rows, { key: '', value: '', type: 'text', enabled: true }]);
  };

  const updateRow = (index: number, patch: Partial<FormDataRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="w-5" />
        <span className="flex-1">Key</span>
        <span className="w-20 text-center">Type</span>
        <span className="flex-1">Value</span>
        <span className="w-6" />
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateRow(i, { enabled: !row.enabled })}
            className={`h-4 w-4 shrink-0 rounded border transition-colors ${
              row.enabled ? 'border-emerald-500 bg-emerald-500' : 'border-white/20 bg-transparent'
            }`}
          />

          <Input
            value={row.key}
            onChange={(e) => updateRow(i, { key: e.target.value })}
            placeholder="key"
            className="min-w-0 flex-1 rounded-lg px-2 py-1.5 font-mono text-xs"
          />

          <select
            value={row.type}
            onChange={(e) => updateRow(i, { type: e.target.value as 'text' | 'file', value: '', file: undefined })}
            className="w-20 rounded-lg border border-white/10 bg-black/30 px-1.5 py-1.5 text-xs text-slate-300 outline-none focus:border-tide-400/50"
          >
            <option value="text">Text</option>
            <option value="file">File</option>
          </select>

          {row.type === 'file' ? (
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-400">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateRow(i, { file, value: file.name });
                  }
                }}
              />
              <span className="truncate">
                {row.file?.name ?? 'Select file...'}
              </span>
            </label>
          ) : (
            <Input
              value={row.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              placeholder="value"
              className="min-w-0 flex-1 rounded-lg px-2 py-1.5 font-mono text-xs"
            />
          )}

          <button
            type="button"
            onClick={() => removeRow(i)}
            className="shrink-0 text-xs text-slate-600 hover:text-red-400"
          >
            x
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-lg border border-dashed border-white/10 py-1.5 text-center text-xs text-slate-500 transition-colors hover:border-white/20 hover:text-slate-400"
      >
        + Add Row
      </button>
    </div>
  );
}
