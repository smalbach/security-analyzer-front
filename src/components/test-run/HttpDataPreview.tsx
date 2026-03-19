import { cn } from '../../lib/cn';
import { CopyButton } from '../ui/CopyButton';
import { formatByteSize, formatHttpData } from './httpResultUtils';

interface HttpDataPreviewProps {
  title: string;
  value: unknown;
  emptyLabel?: string;
  className?: string;
}

export function HttpDataPreview({
  title,
  value,
  emptyLabel = 'No data available.',
  className,
}: HttpDataPreviewProps) {
  const formattedValue = formatHttpData(value);

  return (
    <div className={cn('space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
        {!formattedValue.isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>{formattedValue.isJson ? 'JSON' : 'Raw'}</span>
            <span>{formattedValue.lineCount} lines</span>
            <span>{formatByteSize(formattedValue.bytes)}</span>
            <CopyButton text={formattedValue.text} />
          </div>
        ) : null}
      </div>

      {formattedValue.isEmpty ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <pre className="max-h-96 overflow-auto rounded-xl bg-black/30 p-3 font-mono text-xs text-slate-200">
          {formattedValue.text}
        </pre>
      )}
    </div>
  );
}
