import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  placeholder?: string;
}

export function CustomSelect({ value, onChange, options, className, placeholder }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.children;
    if (items[highlightIndex]) {
      (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < options.length) {
            onChange(options[highlightIndex].value);
            setOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, highlightIndex, options, onChange],
  );

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-xs outline-none transition',
          'border-[var(--surface-border)] bg-[rgba(var(--bg-800),0.6)]',
          'text-[var(--text-primary)] hover:bg-[rgba(var(--bg-800),0.9)]',
          'focus:border-[rgb(var(--accent-400))]/40',
        )}
      >
        <span className={cn(!selectedOption && 'text-[var(--text-secondary)] opacity-60')}>
          {selectedOption?.label ?? placeholder ?? 'Select...'}
        </span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 12 12"
          fill="none"
          className={cn('ml-1 shrink-0 transition-transform', open && 'rotate-180')}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={listRef}
          className={cn(
            'absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border py-0.5 shadow-xl',
            'border-[var(--surface-border)] bg-[rgb(var(--bg-900))]',
          )}
          role="listbox"
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => select(opt.value)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={cn(
                'flex w-full items-center px-2 py-1.5 text-left text-xs transition-colors',
                'text-[var(--text-primary)]',
                opt.value === value && 'font-semibold text-[rgb(var(--accent-400))]',
                i === highlightIndex && 'bg-[rgba(var(--accent-400),0.12)]',
              )}
            >
              {opt.label}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-[var(--text-secondary)]">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
