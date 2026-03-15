/**
 * Builder for response value extractors — JSONPath, regex, header, cookie, full body.
 * Extracted values become available to downstream nodes via {{nodeId.extractorName}}.
 */

const INPUT_CLASS = 'w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none placeholder:text-slate-500';
const SELECT_CLASS = 'w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none';

const EXTRACTOR_TYPES = [
  { value: 'jsonpath', label: 'JSONPath' },
  { value: 'regex', label: 'Regex' },
  { value: 'header', label: 'Header' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'full_body', label: 'Full Body' },
] as const;

interface ExtractorListProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ExtractorList({ config, onChange }: ExtractorListProps) {
  const extractors = (config.extractors || []) as Array<Record<string, unknown>>;

  const add = () => {
    onChange({ ...config, extractors: [...extractors, { name: '', expression: '', type: 'jsonpath' }] });
  };

  const update = (index: number, field: string, value: unknown) => {
    const updated = extractors.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    onChange({ ...config, extractors: updated });
  };

  const remove = (index: number) => {
    onChange({ ...config, extractors: extractors.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      {extractors.map((ex, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-2">
          {/* Name + remove */}
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={String(ex.name || '')}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Variable name"
              className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
            <button type="button" onClick={() => remove(i)} className="ml-1 text-xs text-red-400 transition hover:text-red-300">
              &times;
            </button>
          </div>

          {/* Type */}
          <select value={String(ex.type || 'jsonpath')} onChange={(e) => update(i, 'type', e.target.value)} className={SELECT_CLASS}>
            {EXTRACTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {/* Expression */}
          <input
            type="text"
            value={String(ex.expression || '')}
            onChange={(e) => update(i, 'expression', e.target.value)}
            placeholder="Expression (e.g. $.data.id)"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
      >
        + Add Extractor
      </button>
    </div>
  );
}
