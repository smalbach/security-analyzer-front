import { useCallback, useEffect, useRef, useState } from 'react';
import type { TemplateCompletion } from '../../../hooks/useTemplateCompletions';

interface TemplateInputProps {
  value: string;
  onChange: (value: string) => void;
  completions: TemplateCompletion[];
  placeholder?: string;
  className?: string;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40 hover:bg-white/[0.07] font-mono';

const TYPE_COLORS: Record<string, string> = {
  env: 'text-emerald-400',
  extractor: 'text-sky-400',
  var: 'text-amber-400',
};

const TYPE_LABELS: Record<string, string> = {
  env: 'ENV',
  extractor: 'NODE',
  var: 'VAR',
};

/**
 * A text input that shows a dropdown of template variable suggestions
 * when the user types `{{`. Supports environment variables, upstream
 * node extractors, and flow global variables.
 *
 * Based on the VariableAutocomplete pattern from endpoint-editor.
 */
export function TemplateInput({
  value,
  onChange,
  completions,
  placeholder,
  className,
}: TemplateInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = filter
    ? completions.filter((c) =>
        c.displayLabel.toLowerCase().includes(filter.toLowerCase()),
      )
    : completions;

  /** Look backwards from cursor for an unclosed `{{`. */
  const findOpenBrace = useCallback(
    (text: string, pos: number): number => {
      const before = text.slice(0, pos);
      const lastOpen = before.lastIndexOf('{{');
      if (lastOpen === -1) return -1;
      const afterOpen = before.slice(lastOpen + 2);
      if (afterOpen.includes('}}')) return -1;
      return lastOpen;
    },
    [],
  );

  const handleInput = useCallback(
    (newValue: string, selectionStart: number) => {
      onChange(newValue);
      setCursorPos(selectionStart);

      const openPos = findOpenBrace(newValue, selectionStart);
      if (openPos !== -1) {
        const partial = newValue.slice(openPos + 2, selectionStart);
        setFilter(partial);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
        setFilter('');
      }
    },
    [onChange, findOpenBrace],
  );

  const insertVariable = useCallback(
    (completion: TemplateCompletion) => {
      const openPos = findOpenBrace(value, cursorPos);
      if (openPos === -1) return;

      const before = value.slice(0, openPos);
      const after = value.slice(cursorPos);
      const insertion = completion.label; // e.g. "{{env.baseUrl}}"
      const newValue = before + insertion + after;
      onChange(newValue);
      setShowDropdown(false);
      setFilter('');

      requestAnimationFrame(() => {
        const newPos = before.length + insertion.length;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      });
    },
    [value, cursorPos, onChange, findOpenBrace],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertVariable(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) =>
          handleInput(e.target.value, e.target.selectionStart ?? 0)
        }
        onKeyDown={handleKeyDown}
        onClick={(e) =>
          handleInput(
            value,
            (e.target as HTMLInputElement).selectionStart ?? 0,
          )
        }
        placeholder={placeholder}
        className={className || INPUT_CLASS}
        autoComplete="off"
      />

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-80 overflow-auto rounded-lg border border-white/10 bg-slate-950/95 shadow-lg backdrop-blur-xl"
        >
          {filtered.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => insertVariable(c)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                i === selectedIndex
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span
                className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${TYPE_COLORS[c.type] || 'text-slate-500'} bg-white/5`}
              >
                {TYPE_LABELS[c.type] || c.type}
              </span>
              <span className="font-mono font-medium text-slate-200">
                {c.displayLabel}
              </span>
              <span className="ml-auto truncate text-[10px] text-slate-600">
                {c.detail}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
