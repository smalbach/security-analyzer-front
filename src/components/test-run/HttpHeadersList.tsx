import { getHeaderEntries } from './httpResultUtils';

interface HttpHeadersListProps {
  title: string;
  headers: Record<string, string>;
  emptyLabel?: string;
}

export function HttpHeadersList({
  title,
  headers,
  emptyLabel = 'No headers available.',
}: HttpHeadersListProps) {
  const entries = getHeaderEntries(headers);

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
        <span className="text-[11px] text-slate-500">{entries.length} headers</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-xs">
          {entries.map(([key, currentValue]) => (
            <div key={key} className="flex flex-col gap-1 border-b border-white/5 py-1 last:border-b-0">
              <span className="text-tide-300">{key}</span>
              <span className="break-all text-slate-300">{currentValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
