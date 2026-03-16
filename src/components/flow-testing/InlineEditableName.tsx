import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/cn';

interface InlineEditableNameProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineEditableName({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = 'Untitled',
  disabled = false,
}: InlineEditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setDraft(value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void handleSave()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSave();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        disabled={saving}
        placeholder={placeholder}
        className={cn(
          'rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-sm text-slate-100 outline-none transition focus:border-[rgb(var(--accent-400))]/40',
          inputClassName,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'cursor-pointer rounded px-1 py-0.5 transition hover:bg-white/10',
        disabled && 'pointer-events-none',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) setEditing(true);
      }}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}
