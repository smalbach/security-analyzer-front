import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnvironmentVariable } from '../../types/environments';

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  variables: EnvironmentVariable[];
  placeholder?: string;
  className?: string;
  type?: string;
  /** Use textarea instead of input */
  multiline?: boolean;
  rows?: number;
}

/**
 * An input/textarea that shows an autocomplete dropdown when the user types `{{`.
 * Lists all enabled environment variables from the active environment.
 */
export function VariableAutocomplete({
  value,
  onChange,
  variables,
  placeholder,
  className = '',
  type,
  multiline,
  rows,
}: VariableAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enabledVars = variables.filter((v) => v.enabled);
  const filtered = filter
    ? enabledVars.filter((v) => v.key.toLowerCase().includes(filter.toLowerCase()))
    : enabledVars;

  const findOpenBrace = useCallback((text: string, pos: number): number => {
    // Look backwards from cursor for `{{` that isn't closed by `}}`
    const before = text.slice(0, pos);
    const lastOpen = before.lastIndexOf('{{');
    if (lastOpen === -1) return -1;
    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes('}}')) return -1;
    return lastOpen;
  }, []);

  const handleInput = useCallback((newValue: string, selectionStart: number) => {
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
  }, [onChange, findOpenBrace]);

  const insertVariable = useCallback((varKey: string) => {
    const openPos = findOpenBrace(value, cursorPos);
    if (openPos === -1) return;

    const before = value.slice(0, openPos);
    const after = value.slice(cursorPos);
    const insertion = `{{${varKey}}}`;
    const newValue = before + insertion + after;
    onChange(newValue);
    setShowDropdown(false);
    setFilter('');

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      const newPos = before.length + insertion.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
      inputRef.current?.focus();
    });
  }, [value, cursorPos, onChange, findOpenBrace]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertVariable(filtered[selectedIndex].key);
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

  const inputProps = {
    ref: inputRef as React.Ref<HTMLInputElement>,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleInput(e.target.value, e.target.selectionStart ?? 0);
    },
    onKeyDown: handleKeyDown,
    onClick: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement;
      handleInput(value, target.selectionStart ?? 0);
    },
    placeholder,
    type,
    className: `${className} w-full font-mono`,
    autoComplete: 'off',
  };

  return (
    <div className="relative min-w-0 flex-1">
      {multiline ? (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => handleInput(e.target.value, e.target.selectionStart ?? 0)}
          onKeyDown={handleKeyDown}
          onClick={(e) => handleInput(value, (e.target as HTMLTextAreaElement).selectionStart ?? 0)}
          placeholder={placeholder}
          rows={rows}
          className={`${className} w-full font-mono`}
          autoComplete="off"
        />
      ) : (
        <input {...inputProps} />
      )}

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-white/10 bg-slatewave-950/95 shadow-glass backdrop-blur-xl"
        >
          {filtered.map((v, i) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                i === selectedIndex
                  ? 'bg-tide-500/15 text-tide-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="font-mono font-medium">{v.key}</span>
              <span className="ml-auto truncate text-[10px] text-slate-600">
                {v.sensitive ? '••••' : (v.currentValue || v.defaultValue || '(empty)')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
