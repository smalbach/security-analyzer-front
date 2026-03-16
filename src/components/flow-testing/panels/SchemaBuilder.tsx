import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { JsonEditor } from './JsonEditor';
import {
  SchemaFieldRow,
  createEmptyField,
  fieldsToJsonSchema,
  jsonSchemaToFields,
  jsonResponseToFields,
  type SchemaField,
} from './SchemaFieldRow';

interface SchemaBuilderProps {
  value: unknown;
  onChange: (schema: unknown) => void;
}

type ModalTab = 'visual' | 'raw' | 'import';

/** Count total fields recursively */
function countFields(fields: SchemaField[]): number {
  let count = 0;
  for (const f of fields) {
    count++;
    if (f.children) count += countFields(f.children);
    if (f.items?.children) count += countFields(f.items.children);
  }
  return count;
}

export function SchemaBuilder({ value, onChange }: SchemaBuilderProps) {
  const [showModal, setShowModal] = useState(false);
  // Modal internal state (only committed on Apply)
  const [modalFields, setModalFields] = useState<SchemaField[]>([]);
  const [modalTab, setModalTab] = useState<ModalTab>('visual');
  const [strict, setStrict] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Derive inline summary from the current value
  const currentFields = value && typeof value === 'object' && !Array.isArray(value)
    ? jsonSchemaToFields(value)
    : [];
  const fieldCount = countFields(currentFields);
  const hasSchema = fieldCount > 0;
  const currentStrict = value && typeof value === 'object'
    ? (value as Record<string, unknown>).additionalProperties === false
    : false;

  const openModal = () => {
    // Load current schema into modal state
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      setModalFields(jsonSchemaToFields(value));
      setStrict((value as Record<string, unknown>).additionalProperties === false);
    } else {
      setModalFields([]);
      setStrict(false);
    }
    setModalTab('visual');
    setShowPreview(false);
    setImportText('');
    setImportError('');
    setShowModal(true);
  };

  const handleApply = () => {
    if (modalFields.length === 0) {
      onChange(null);
    } else {
      onChange(fieldsToJsonSchema(modalFields, { strict }));
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const addField = () => {
    setModalFields((prev) => [...prev, createEmptyField()]);
  };

  const updateField = (index: number, updated: SchemaField) => {
    setModalFields((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const removeField = (index: number) => {
    setModalFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Import from response
  const handleImport = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(importText);
      const fields = jsonResponseToFields(parsed);
      if (fields.length === 0) {
        setImportError('Could not extract fields. Ensure the JSON is an object or array of objects.');
        return;
      }
      setModalFields(fields);
      setModalTab('visual');
    } catch {
      setImportError('Invalid JSON. Please paste valid JSON.');
    }
  };

  // Raw mode value
  const rawValue = modalFields.length > 0
    ? JSON.stringify(fieldsToJsonSchema(modalFields, { strict }), null, 2)
    : '{}';

  const handleRawChange = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      setModalFields(jsonSchemaToFields(parsed));
      if (parsed.additionalProperties === false) setStrict(true);
    } catch {
      // Ignore parse errors while typing
    }
  };

  return (
    <>
      {/* Inline compact view */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={openModal}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
        >
          {hasSchema ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-200">{fieldCount} field{fieldCount !== 1 ? 's' : ''} defined</span>
                {currentStrict && (
                  <span className="ml-2 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold text-amber-400">
                    STRICT
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[rgb(var(--accent-400))]">Edit Schema</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">No schema defined</span>
              <span className="text-[10px] text-[rgb(var(--accent-400))]">Create Schema</span>
            </div>
          )}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          open
          title="Response Schema Editor"
          description="Define the expected response structure for contract testing. Required fields that are missing will trigger errors; extra fields not in the schema will trigger warnings."
          size="2xl"
          onClose={handleCancel}
          footer={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Strict mode toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={strict}
                    onChange={(e) => setStrict(e.target.checked)}
                    className="h-3.5 w-3.5 accent-amber-500"
                  />
                  Strict mode
                  <span className="text-[9px] text-slate-600">(no extra fields allowed)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleApply}>Apply Schema</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Tab buttons */}
            <div className="flex items-center gap-1">
              {(['visual', 'raw', 'import'] as ModalTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalTab(tab)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                    modalTab === tab
                      ? 'bg-[rgba(var(--accent-400),0.15)] text-[rgb(var(--accent-400))]'
                      : 'bg-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === 'visual' ? 'Visual' : tab === 'raw' ? 'Raw JSON' : 'Import from Response'}
                </button>
              ))}

              {modalTab === 'visual' && modalFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`ml-auto rounded px-2 py-1 text-[10px] transition ${
                    showPreview
                      ? 'bg-sky-500/15 text-sky-400'
                      : 'bg-white/5 text-slate-600 hover:text-slate-400'
                  }`}
                >
                  Preview JSON
                </button>
              )}
            </div>

            {/* Visual tab */}
            {modalTab === 'visual' && (
              <div className="space-y-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-2 max-h-[50vh] overflow-y-auto">
                {modalFields.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-600">
                    No fields defined. Add a field manually or use "Import from Response" to generate from a real API response.
                  </p>
                )}

                {modalFields.map((field, i) => (
                  <SchemaFieldRow
                    key={field.id}
                    field={field}
                    onChange={(updated) => updateField(i, updated)}
                    onRemove={() => removeField(i)}
                    depth={0}
                  />
                ))}

                <button
                  type="button"
                  onClick={addField}
                  className="mt-1 w-full rounded-lg border border-dashed border-white/10 bg-white/[0.02] py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-300"
                >
                  + Add Field
                </button>
              </div>
            )}

            {/* Raw JSON tab */}
            {modalTab === 'raw' && (
              <JsonEditor
                value={rawValue}
                onChange={handleRawChange}
                placeholder="Paste or edit JSON Schema"
                minHeight="300px"
              />
            )}

            {/* Import from Response tab */}
            {modalTab === 'import' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Paste a real API response below. The schema will be automatically inferred from its structure.
                  All fields are marked as required by default — you can adjust them after import.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setImportError(''); }}
                  placeholder='Paste your API JSON response here...'
                  className="h-64 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40"
                />
                {importError && (
                  <p className="text-xs text-red-400">{importError}</p>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImport}
                  className="w-full"
                >
                  Generate Schema from Response
                </Button>
              </div>
            )}

            {/* Preview */}
            {modalTab === 'visual' && showPreview && modalFields.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Generated JSON Schema
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg border border-white/5 bg-white/[0.02] p-3 font-mono text-[11px] text-slate-400">
                  {JSON.stringify(fieldsToJsonSchema(modalFields, { strict }), null, 2)}
                </pre>
              </div>
            )}

            {/* Contract validation info */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Contract Validation Rules
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400/80" />
                  <span className="text-slate-400">Required field missing</span>
                </div>
                <div className="text-slate-500">Error — contract broken</div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400/80" />
                  <span className="text-slate-400">Type mismatch</span>
                </div>
                <div className="text-slate-500">Error — wrong data type</div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <span className="text-slate-400">Extra fields in response</span>
                </div>
                <div className="text-slate-500">Warning — contract drift</div>

                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  <span className="text-slate-400">Optional field missing</span>
                </div>
                <div className="text-slate-500">OK — field is optional</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
