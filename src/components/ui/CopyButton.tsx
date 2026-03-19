import { cn } from '../../lib/cn';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { Tooltip } from './Tooltip';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'xs' | 'sm';
}

export function CopyButton({ text, className, size = 'xs' }: CopyButtonProps) {
  const { copied, copyToClipboard } = useCopyToClipboard();
  const iconSize = size === 'xs' ? 14 : 16;

  return (
    <Tooltip content={copied ? 'Copied!' : 'Copy'}>
      <button
        type="button"
        onClick={() => void copyToClipboard(text)}
        className={cn(
          'inline-flex items-center justify-center rounded transition',
          size === 'xs' ? 'h-5 w-5' : 'h-6 w-6',
          copied
            ? 'text-emerald-400'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
          className,
        )}
      >
        {copied ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4.5 10.5l3.5 3.5 7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <rect x="7" y="7" width="9" height="9" rx="1.5" />
            <path d="M13 7V5.5A1.5 1.5 0 0011.5 4h-7A1.5 1.5 0 003 5.5v7A1.5 1.5 0 004.5 14H7" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </Tooltip>
  );
}
