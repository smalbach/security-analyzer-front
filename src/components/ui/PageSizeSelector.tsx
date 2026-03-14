const OPTIONS = [30, 50, 100] as const;

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

export function PageSizeSelector({ value, onChange, disabled }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>Mostrar</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none transition hover:border-white/20 focus:border-tide-400/50 disabled:opacity-50"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt} className="bg-slatewave-900">
            {opt}
          </option>
        ))}
      </select>
      <span>por página</span>
    </div>
  );
}
