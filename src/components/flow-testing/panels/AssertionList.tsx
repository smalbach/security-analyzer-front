/**
 * Visual assertion builder — each row is a configurable assertion
 * (status, header, jsonpath, body, response time, regex).
 */

const SELECT_CLASS = 'rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none';
const INPUT_CLASS = 'w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none placeholder:text-slate-500';

const ASSERTION_TYPES = [
  { value: 'status', label: 'Status' },
  { value: 'header', label: 'Header' },
  { value: 'jsonpath', label: 'JSONPath' },
  { value: 'body', label: 'Body' },
  { value: 'response_time', label: 'Time' },
  { value: 'regex', label: 'Regex' },
] as const;

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'not exists' },
  { value: 'matches_regex', label: 'regex' },
  { value: 'is_type', label: 'is type' },
  { value: 'is_array', label: 'is array' },
  { value: 'is_not_empty', label: 'not empty' },
] as const;

interface AssertionListProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function AssertionList({ config, onChange }: AssertionListProps) {
  const assertions = (config.assertions || []) as Array<Record<string, unknown>>;

  const add = () => {
    onChange({
      ...config,
      assertions: [
        ...assertions,
        { name: '', type: 'status', target: 'statusCode', operator: 'equals', expected: 200, severity: 'error' },
      ],
    });
  };

  const update = (index: number, field: string, value: unknown) => {
    const updated = assertions.map((a, i) => (i === index ? { ...a, [field]: value } : a));
    onChange({ ...config, assertions: updated });
  };

  const remove = (index: number) => {
    onChange({ ...config, assertions: assertions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      {assertions.map((a, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-2">
          {/* Name + remove */}
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={String(a.name || '')}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Test name"
              className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
            <button type="button" onClick={() => remove(i)} className="ml-1 text-xs text-red-400 transition hover:text-red-300">
              &times;
            </button>
          </div>

          {/* Type + Operator */}
          <div className="grid grid-cols-2 gap-1">
            <select value={String(a.type || 'status')} onChange={(e) => update(i, 'type', e.target.value)} className={SELECT_CLASS}>
              {ASSERTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={String(a.operator || 'equals')} onChange={(e) => update(i, 'operator', e.target.value)} className={SELECT_CLASS}>
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Target */}
          <input
            type="text"
            value={String(a.target || '')}
            onChange={(e) => update(i, 'target', e.target.value)}
            placeholder="Target (e.g. $.data[0].id)"
            className={`${INPUT_CLASS} font-mono`}
          />

          {/* Expected */}
          <input
            type="text"
            value={String(a.expected ?? '')}
            onChange={(e) => update(i, 'expected', e.target.value)}
            placeholder="Expected value"
            className={INPUT_CLASS}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
      >
        + Add Assertion
      </button>
    </div>
  );
}
