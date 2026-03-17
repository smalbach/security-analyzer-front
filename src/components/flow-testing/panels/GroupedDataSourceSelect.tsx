/**
 * A grouped dropdown that shows upstream nodes and their available fields.
 * Used by ConditionNodeConfig (visual builder) and LoopNodeConfig (array source picker).
 * Fields can be filtered by type (e.g. 'array' for loop source selection).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import type { DataSource, DataSourceField } from '../../../hooks/useUpstreamDataSources';

const NODE_TYPE_COLORS: Record<string, string> = {
  auth: 'text-yellow-400',
  request: 'text-sky-400',
  condition: 'text-emerald-400',
  loop: 'text-violet-400',
  merge: 'text-slate-400',
  delay: 'text-slate-400',
  script: 'text-pink-400',
};

const ORIGIN_BADGES: Record<string, { label: string; cls: string }> = {
  extractor: { label: 'EXTRACTED', cls: 'bg-sky-500/15 text-sky-400' },
  schema: { label: 'SCHEMA', cls: 'bg-orange-500/15 text-orange-400' },
  loop: { label: 'LOOP', cls: 'bg-violet-500/15 text-violet-400' },
  auth: { label: 'AUTO', cls: 'bg-yellow-500/15 text-yellow-400' },
};

interface GroupedDataSourceSelectProps {
  dataSources: DataSource[];
  value: string; // current template expression like "{{nodeId.field}}"
  onChange: (templateExpression: string) => void;
  filterFieldType?: string; // e.g. 'array' for loop picker
  placeholder?: string;
  emptyMessage?: string;
}

/** Parse a template expression to extract nodeRef (label or id) and field name */
function parseTemplate(template: string): { nodeRef: string; field: string } | null {
  const match = template.match(/^\{\{([^.]+)\.(.+)\}\}$/);
  if (!match) return null;
  return { nodeRef: match[1], field: match[2] };
}

export function GroupedDataSourceSelect({
  dataSources,
  value,
  onChange,
  filterFieldType,
  placeholder = 'Select a data source...',
  emptyMessage = 'No upstream data available. Add extractors or Response Schemas to upstream nodes.',
}: GroupedDataSourceSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Filter data sources
  const filteredSources = useMemo(() => {
    return dataSources
      .map((ds) => {
        let fields = ds.fields;
        // Filter by field type
        if (filterFieldType) {
          fields = fields.filter((f) => f.fieldType === filterFieldType);
        }
        // Filter by search
        if (search) {
          const q = search.toLowerCase();
          fields = fields.filter(
            (f) =>
              f.name.toLowerCase().includes(q) ||
              ds.nodeLabel.toLowerCase().includes(q),
          );
        }
        return { ...ds, fields };
      })
      .filter((ds) => ds.fields.length > 0);
  }, [dataSources, filterFieldType, search]);

  // Resolve the current value to a display label (supports both label-based and UUID-based expressions)
  const displayLabel = useMemo(() => {
    const parsed = parseTemplate(value);
    if (!parsed) return null;
    // Match by nodeId (UUID) or by nodeLabel (alias)
    const source = dataSources.find(
      (ds) => ds.nodeId === parsed.nodeRef || ds.nodeLabel.toLowerCase() === parsed.nodeRef.toLowerCase(),
    );
    if (!source) return null;
    const field = source.fields.find((f) => f.name === parsed.field);
    if (!field) return null;
    return `${source.nodeLabel} → ${field.name}`;
  }, [value, dataSources]);

  const handleSelect = (field: DataSourceField) => {
    onChange(field.templateExpression);
    setOpen(false);
    setSearch('');
  };

  const totalFields = filteredSources.reduce((sum, ds) => sum + ds.fields.length, 0);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-xs outline-none transition',
          'border-[var(--surface-border)] bg-[rgba(var(--bg-800),0.6)]',
          'text-[var(--text-primary)] hover:bg-[rgba(var(--bg-800),0.9)]',
          'focus:border-[rgb(var(--accent-400))]/40',
        )}
      >
        {displayLabel ? (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">{displayLabel.split(' → ')[0]}</span>
            <span className="text-slate-600">→</span>
            <span className="font-mono font-medium text-slate-200">{displayLabel.split(' → ')[1]}</span>
          </span>
        ) : (
          <span className="text-[var(--text-secondary)] opacity-60">{placeholder}</span>
        )}
        <svg
          width={12} height={12} viewBox="0 0 12 12" fill="none"
          className={cn('ml-1 shrink-0 transition-transform', open && 'rotate-180')}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-xl',
            'border-[var(--surface-border)] bg-[rgb(var(--bg-900))]',
          )}
        >
          {/* Search */}
          <div className="border-b border-white/5 p-1.5">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fields..."
              className="w-full rounded bg-white/5 px-2 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto py-0.5">
            {totalFields === 0 && (
              <div className="px-3 py-3 text-center text-[10px] text-slate-500">
                {emptyMessage}
              </div>
            )}

            {filteredSources.map((ds) => (
              <div key={ds.nodeId}>
                {/* Node group header */}
                <div className="flex items-center gap-1.5 px-2.5 pb-0.5 pt-2">
                  <span className={cn('text-[9px] font-bold uppercase', NODE_TYPE_COLORS[ds.nodeType] || 'text-slate-400')}>
                    {ds.nodeType}
                  </span>
                  <span className="text-[10px] font-medium text-slate-300">{ds.nodeLabel}</span>
                  <span className="font-mono text-[8px] text-slate-600">#{ds.nodeId.slice(0, 6)}</span>
                </div>

                {/* Fields */}
                {ds.fields.map((field) => {
                  const isSelected = field.templateExpression === value;
                  const originBadge = ORIGIN_BADGES[field.origin];

                  return (
                    <button
                      key={field.templateExpression}
                      type="button"
                      onClick={() => handleSelect(field)}
                      className={cn(
                        'flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] transition-colors',
                        isSelected
                          ? 'bg-[rgba(var(--accent-400),0.12)] font-semibold text-[rgb(var(--accent-400))]'
                          : 'text-slate-300 hover:bg-white/5',
                      )}
                    >
                      <span className="font-mono font-medium">{field.name}</span>
                      {originBadge && (
                        <span className={cn('rounded px-1 py-0.5 text-[7px] font-bold uppercase', originBadge.cls)}>
                          {originBadge.label}
                        </span>
                      )}
                      {field.fieldType && (
                        <span className="rounded bg-white/5 px-1 py-0.5 text-[7px] text-slate-500">
                          {field.fieldType}
                        </span>
                      )}
                      {field.jsonPath && (
                        <span className="ml-auto truncate font-mono text-[8px] text-slate-600">
                          {field.jsonPath}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
