interface BackendTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const BACKEND_TYPES = [
  { id: 'nestjs', label: 'NestJS', available: true, icon: 'N' },
  { id: 'express', label: 'Express', available: false, icon: 'E' },
  { id: 'fastapi', label: 'FastAPI', available: false, icon: 'F' },
  { id: 'spring', label: 'Spring Boot', available: false, icon: 'S' },
];

export function BackendTypeSelector({ value, onChange }: BackendTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {BACKEND_TYPES.map((type) => (
        <button
          key={type.id}
          type="button"
          disabled={!type.available}
          onClick={() => type.available && onChange(type.id)}
          className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
            value === type.id
              ? 'border-tide-400 bg-tide-500/10 text-slate-100'
              : type.available
                ? 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
          }`}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
              value === type.id
                ? 'bg-tide-500/20 text-tide-300'
                : type.available
                  ? 'bg-white/10 text-slate-400'
                  : 'bg-white/5 text-slate-600'
            }`}
          >
            {type.icon}
          </span>
          <div>
            <p className="text-sm font-medium">{type.label}</p>
            {!type.available && (
              <p className="text-xs text-slate-600">Coming soon</p>
            )}
          </div>
          {value === type.id && (
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-tide-400" />
          )}
        </button>
      ))}
    </div>
  );
}
