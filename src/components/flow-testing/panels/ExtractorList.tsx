/**
 * Builder for response value extractors — JSONPath, regex, header, cookie, full body.
 * Extracted values become available to downstream nodes via {{nodeId.extractorName}}.
 */

import { useState } from 'react';
import { CustomSelect } from '../../ui/CustomSelect';
import { jsonSchemaToFields, schemaFieldsToExtractors } from './SchemaFieldRow';

const INPUT_CLASS = 'w-full rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-slate-300 outline-none placeholder:text-slate-500';

const EXTRACTOR_TYPES = [
  { value: 'jsonpath', label: 'JSONPath' },
  { value: 'regex', label: 'Regex' },
  { value: 'header', label: 'Header' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'full_body', label: 'Full Body' },
] as const;

interface ExtractorListProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ExtractorList({ config, onChange }: ExtractorListProps) {
  const extractors = (config.extractors || []) as Array<Record<string, unknown>>;
  const hasSchema = !!(config.responseSchema && typeof config.responseSchema === 'object');
  const [showPreview, setShowPreview] = useState(false);

  const add = () => {
    onChange({ ...config, extractors: [...extractors, { name: '', expression: '', type: 'jsonpath' }] });
  };

  const update = (index: number, field: string, value: unknown) => {
    const updated = extractors.map((e, i) => (i === index ? { ...e, [field]: value } : e));
    // Filter out completely empty extractors (both name and expression blank) on save
    const cleaned = updated.filter(
      (e) => String(e.name || '').trim() || String(e.expression || '').trim(),
    );
    onChange({ ...config, extractors: cleaned.length > 0 ? cleaned : updated });
  };

  const remove = (index: number) => {
    onChange({ ...config, extractors: extractors.filter((_, i) => i !== index) });
  };

  // Auto-generate extractors from the response schema
  const generateFromSchema = () => {
    if (!config.responseSchema) return;
    const fields = jsonSchemaToFields(config.responseSchema);
    const suggested = schemaFieldsToExtractors(fields);
    const existingNames = new Set(extractors.map((e) => String(e.name || '')));
    const newExtractors = suggested.filter((s) => !existingNames.has(s.name));
    if (newExtractors.length === 0) return;
    onChange({
      ...config,
      extractors: [...extractors, ...newExtractors.map((e) => ({ ...e }))],
    });
    setShowPreview(false);
  };

  // Preview what would be generated
  const getPreviewExtractors = () => {
    if (!config.responseSchema) return [];
    const fields = jsonSchemaToFields(config.responseSchema);
    const suggested = schemaFieldsToExtractors(fields);
    const existingNames = new Set(extractors.map((e) => String(e.name || '')));
    return suggested.filter((s) => !existingNames.has(s.name));
  };

  return (
    <div className="space-y-2">
      {/* Auto-generate from Schema */}
      {hasSchema && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-sky-300">
                Auto-generate from Schema
              </div>
              <div className="text-[9px] text-sky-300/60">
                Create extractors for all fields defined in your Response Schema
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="rounded bg-white/5 px-2 py-1 text-[9px] text-sky-400 transition hover:bg-white/10"
              >
                {showPreview ? 'Hide' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={generateFromSchema}
                className="rounded bg-sky-500/20 px-2 py-1 text-[9px] font-semibold text-sky-300 transition hover:bg-sky-500/30"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Preview of what will be generated */}
          {showPreview && <ExtractorPreview extractors={getPreviewExtractors()} />}
        </div>
      )}

      {/* Existing extractors */}
      {extractors.map((ex, i) => {
        const nameEmpty = !String(ex.name || '').trim();
        const exprEmpty = !String(ex.expression || '').trim();
        const isIncomplete = (nameEmpty && !exprEmpty) || (!nameEmpty && exprEmpty);
        const isBothEmpty = nameEmpty && exprEmpty;
        return (
          <div key={i} className={`space-y-1.5 rounded-lg border p-2 ${isBothEmpty ? 'border-amber-500/25 bg-amber-500/[0.04]' : isIncomplete ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
            {/* Name + remove */}
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={String(ex.name || '')}
                onChange={(e) => update(i, 'name', e.target.value)}
                placeholder="Variable name"
                className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
              />
              <button type="button" onClick={() => remove(i)} className="ml-1 text-xs text-red-400 transition hover:text-red-300">
                &times;
              </button>
            </div>

            {/* Type */}
            <CustomSelect
              value={String(ex.type || 'jsonpath')}
              onChange={(v) => update(i, 'type', v)}
              options={[...EXTRACTOR_TYPES]}
            />

            {/* Expression */}
            <input
              type="text"
              value={String(ex.expression || '')}
              onChange={(e) => update(i, 'expression', e.target.value)}
              placeholder="Expression (e.g. $.data.id)"
              className={`${INPUT_CLASS} font-mono`}
            />

            {/* Validation warning */}
            {isBothEmpty && (
              <div className="text-[9px] text-amber-400">Empty extractor — will be removed on next edit</div>
            )}
            {isIncomplete && (
              <div className="text-[9px] text-amber-400">
                {nameEmpty ? 'Missing variable name' : 'Missing expression'}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
      >
        + Add Extractor
      </button>

      {/* Hint when no extractors and no schema */}
      {extractors.length === 0 && !hasSchema && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-2 text-[10px] text-amber-300/70">
          <strong>Tip:</strong> Define a Response Schema first, then use "Auto-generate" to create extractors automatically.
          Extractors make response data available to downstream nodes via {'{{'}nodeId.name{'}}'}  templates.
        </div>
      )}
    </div>
  );
}

function ExtractorPreview({ extractors }: { extractors: Array<{ name: string; expression: string }> }) {
  if (extractors.length === 0) {
    return (
      <div className="mt-2 text-[9px] text-sky-300/50">
        All schema fields already have extractors. Nothing new to generate.
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-0.5">
      <div className="text-[9px] text-sky-300/60">
        {extractors.length} new extractor{extractors.length > 1 ? 's' : ''} will be created:
      </div>
      {extractors.map((ext) => (
        <div key={ext.name} className="flex items-center gap-2 rounded bg-white/5 px-2 py-0.5">
          <span className="font-mono text-[9px] font-medium text-sky-300">{ext.name}</span>
          <span className="text-[8px] text-slate-500">{ext.expression}</span>
        </div>
      ))}
    </div>
  );
}
