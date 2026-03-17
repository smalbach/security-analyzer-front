import { useState } from 'react';
import { CustomSelect } from '../../ui/CustomSelect';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  required: boolean;
  nullable?: boolean;
  description?: string;
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // Number/integer constraints
  minimum?: number;
  maximum?: number;
  // Enum values (any type)
  enum?: string[];
  // Nested fields for object type
  children?: SchemaField[];
  // Item schema for array type
  items?: SchemaField;
}

const SCHEMA_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
];

const INPUT_CLASS = 'w-full rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40';

interface SchemaFieldRowProps {
  field: SchemaField;
  onChange: (field: SchemaField) => void;
  onRemove: () => void;
  depth: number;
}

let _idCounter = 0;
export function generateFieldId(): string {
  return `sf_${Date.now()}_${_idCounter++}`;
}

export function createEmptyField(): SchemaField {
  return {
    id: generateFieldId(),
    name: '',
    type: 'string',
    required: false,
  };
}

export function SchemaFieldRow({ field, onChange, onRemove, depth }: SchemaFieldRowProps) {
  const [showConstraints, setShowConstraints] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<SchemaField>) => onChange({ ...field, ...patch });

  const hasNested = field.type === 'object' || field.type === 'array';

  // Children management for object type
  const addChild = () => {
    update({ children: [...(field.children || []), createEmptyField()] });
  };

  const updateChild = (index: number, child: SchemaField) => {
    const children = [...(field.children || [])];
    children[index] = child;
    update({ children });
  };

  const removeChild = (index: number) => {
    update({ children: (field.children || []).filter((_, i) => i !== index) });
  };

  // Items management for array type
  const updateItems = (items: SchemaField) => {
    update({ items });
  };

  const setArrayItemType = (type: SchemaField['type']) => {
    const existingItems = field.items;
    const newItems: SchemaField = {
      id: existingItems?.id || generateFieldId(),
      name: 'items',
      type,
      required: false,
      children: type === 'object' ? (existingItems?.children || []) : undefined,
      items: type === 'array' ? (existingItems?.items || { id: generateFieldId(), name: 'items', type: 'string', required: false }) : undefined,
    };
    update({ items: newItems });
  };

  // Add child to array items (when items type is object)
  const addItemChild = () => {
    if (!field.items) return;
    const children = [...(field.items.children || []), createEmptyField()];
    updateItems({ ...field.items, children });
  };

  const updateItemChild = (index: number, child: SchemaField) => {
    if (!field.items) return;
    const children = [...(field.items.children || [])];
    children[index] = child;
    updateItems({ ...field.items, children });
  };

  const removeItemChild = (index: number) => {
    if (!field.items) return;
    updateItems({
      ...field.items,
      children: (field.items.children || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className={`${depth > 0 ? 'ml-3 border-l border-white/5 pl-2' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-1 py-1">
        {/* Expand toggle for nested types */}
        {hasNested ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-500"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Name input */}
        <input
          type="text"
          value={field.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="field name"
          className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40"
        />

        {/* Type select */}
        <div className="w-20 shrink-0">
          <CustomSelect
            value={field.type}
            onChange={(v) => {
              const newType = v as SchemaField['type'];
              const patch: Partial<SchemaField> = { type: newType };
              if (newType === 'object' && !field.children) patch.children = [];
              if (newType === 'array' && !field.items) {
                patch.items = { id: generateFieldId(), name: 'items', type: 'string', required: false };
              }
              update(patch);
            }}
            options={SCHEMA_TYPES}
          />
        </div>

        {/* Required toggle */}
        <button
          type="button"
          onClick={() => update({ required: !field.required })}
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase transition ${
            field.required
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-white/5 text-slate-600 hover:text-slate-400'
          }`}
          title={field.required ? 'Required (click to make optional)' : 'Optional (click to make required)'}
        >
          REQ
        </button>

        {/* Nullable toggle */}
        <button
          type="button"
          onClick={() => update({ nullable: !field.nullable })}
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase transition ${
            field.nullable
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-white/5 text-slate-600 hover:text-slate-400'
          }`}
          title={field.nullable ? 'Nullable (click to make non-null)' : 'Non-null (click to allow null)'}
        >
          N
        </button>

        {/* Constraints toggle */}
        <button
          type="button"
          onClick={() => setShowConstraints(!showConstraints)}
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] transition ${
            showConstraints
              ? 'bg-sky-500/20 text-sky-400'
              : 'bg-white/5 text-slate-600 hover:text-slate-400'
          }`}
          title="Toggle constraints"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs text-red-400 transition hover:text-red-300"
        >
          &times;
        </button>
      </div>

      {/* Constraints panel */}
      {showConstraints && (
        <div className="mb-1 ml-4 space-y-1 rounded border border-white/5 bg-white/[0.02] p-1.5">
          <input
            type="text"
            value={field.description || ''}
            onChange={(e) => update({ description: e.target.value || undefined })}
            placeholder="Description"
            className={INPUT_CLASS}
          />

          {field.type === 'string' && (
            <>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={field.minLength ?? ''}
                  onChange={(e) => update({ minLength: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Min length"
                  className={`${INPUT_CLASS} flex-1`}
                />
                <input
                  type="number"
                  value={field.maxLength ?? ''}
                  onChange={(e) => update({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Max length"
                  className={`${INPUT_CLASS} flex-1`}
                />
              </div>
              <input
                type="text"
                value={field.pattern || ''}
                onChange={(e) => update({ pattern: e.target.value || undefined })}
                placeholder="Regex pattern"
                className={`${INPUT_CLASS} font-mono`}
              />
            </>
          )}

          {(field.type === 'number' || field.type === 'integer') && (
            <div className="flex gap-1">
              <input
                type="number"
                value={field.minimum ?? ''}
                onChange={(e) => update({ minimum: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Minimum"
                className={`${INPUT_CLASS} flex-1`}
              />
              <input
                type="number"
                value={field.maximum ?? ''}
                onChange={(e) => update({ maximum: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Maximum"
                className={`${INPUT_CLASS} flex-1`}
              />
            </div>
          )}

          <input
            type="text"
            value={(field.enum || []).join(', ')}
            onChange={(e) => {
              const val = e.target.value.trim();
              update({ enum: val ? val.split(',').map((s) => s.trim()) : undefined });
            }}
            placeholder="Enum values (comma separated)"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* Nested content */}
      {hasNested && expanded && (
        <div className="mt-0.5">
          {/* Object children */}
          {field.type === 'object' && (
            <div>
              {(field.children || []).map((child, i) => (
                <SchemaFieldRow
                  key={child.id}
                  field={child}
                  onChange={(updated) => updateChild(i, updated)}
                  onRemove={() => removeChild(i)}
                  depth={depth + 1}
                />
              ))}
              <button
                type="button"
                onClick={addChild}
                className="ml-3 mt-0.5 rounded border border-dashed border-white/10 px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
              >
                + Add property
              </button>
            </div>
          )}

          {/* Array items */}
          {field.type === 'array' && (
            <div className="ml-3 border-l border-white/5 pl-2">
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-[9px] text-slate-500">Items type:</span>
                <div className="w-20">
                  <CustomSelect
                    value={field.items?.type || 'string'}
                    onChange={(v) => setArrayItemType(v as SchemaField['type'])}
                    options={SCHEMA_TYPES}
                  />
                </div>
              </div>

              {/* Array items → object children */}
              {field.items?.type === 'object' && (
                <div>
                  {(field.items.children || []).map((child, i) => (
                    <SchemaFieldRow
                      key={child.id}
                      field={child}
                      onChange={(updated) => updateItemChild(i, updated)}
                      onRemove={() => removeItemChild(i)}
                      depth={depth + 2}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addItemChild}
                    className="mt-0.5 rounded border border-dashed border-white/10 px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                  >
                    + Add item property
                  </button>
                </div>
              )}

              {/* Array items → nested array */}
              {field.items?.type === 'array' && field.items.items && (
                <div className="ml-3 border-l border-white/5 pl-2">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="text-[9px] text-slate-500">Nested items type:</span>
                    <div className="w-20">
                      <CustomSelect
                        value={field.items.items.type}
                        onChange={(v) => {
                          const newType = v as SchemaField['type'];
                          updateItems({
                            ...field.items!,
                            items: {
                              ...field.items!.items!,
                              type: newType,
                              children: newType === 'object' ? (field.items!.items!.children || []) : undefined,
                            },
                          });
                        }}
                        options={SCHEMA_TYPES}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Schema conversion utilities ----

export function fieldsToJsonSchema(
  fields: SchemaField[],
  options?: { strict?: boolean },
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (!field.name.trim()) continue;

    const baseType = field.type;
    const prop: Record<string, unknown> = {};

    if (field.nullable) {
      prop.type = [baseType, 'null'];
    } else {
      prop.type = baseType;
    }

    if (field.description) prop.description = field.description;
    if (field.enum && field.enum.length > 0) prop.enum = field.enum;

    if (baseType === 'string') {
      if (field.minLength !== undefined) prop.minLength = field.minLength;
      if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
      if (field.pattern) prop.pattern = field.pattern;
    }

    if (baseType === 'number' || baseType === 'integer') {
      if (field.minimum !== undefined) prop.minimum = field.minimum;
      if (field.maximum !== undefined) prop.maximum = field.maximum;
    }

    if (baseType === 'object' && field.children && field.children.length > 0) {
      const nested = fieldsToJsonSchema(field.children, options);
      prop.properties = nested.properties;
      if ((nested.required as string[])?.length > 0) prop.required = nested.required;
      if (options?.strict) prop.additionalProperties = false;
    }

    if (baseType === 'array' && field.items) {
      if (field.items.type === 'object' && field.items.children && field.items.children.length > 0) {
        const nested = fieldsToJsonSchema(field.items.children, options);
        const itemSchema: Record<string, unknown> = { type: 'object', properties: nested.properties };
        if ((nested.required as string[])?.length > 0) itemSchema.required = nested.required;
        if (options?.strict) itemSchema.additionalProperties = false;
        prop.items = itemSchema;
      } else if (field.items.type === 'array' && field.items.items) {
        prop.items = { type: 'array', items: { type: field.items.items.type } };
      } else {
        prop.items = { type: field.items.type };
      }
    }

    properties[field.name] = prop;
    if (field.required) required.push(field.name);
  }

  const schema: Record<string, unknown> = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  if (options?.strict) schema.additionalProperties = false;
  return schema;
}

export function jsonSchemaToFields(schema: unknown): SchemaField[] {
  if (!schema || typeof schema !== 'object') return [];
  const s = schema as Record<string, unknown>;
  const properties = (s.properties || {}) as Record<string, Record<string, unknown>>;
  const required = new Set((s.required || []) as string[]);
  const fields: SchemaField[] = [];

  for (const [name, prop] of Object.entries(properties)) {
    let type: SchemaField['type'] = 'string';
    let nullable = false;

    if (Array.isArray(prop.type)) {
      const types = prop.type.filter((t: string) => t !== 'null');
      nullable = prop.type.includes('null');
      type = (types[0] || 'string') as SchemaField['type'];
    } else {
      type = (prop.type || 'string') as SchemaField['type'];
    }

    const field: SchemaField = {
      id: generateFieldId(),
      name,
      type,
      required: required.has(name),
      nullable,
      description: prop.description as string | undefined,
    };

    if (type === 'string') {
      if (prop.minLength !== undefined) field.minLength = Number(prop.minLength);
      if (prop.maxLength !== undefined) field.maxLength = Number(prop.maxLength);
      if (prop.pattern) field.pattern = String(prop.pattern);
    }

    if (type === 'number' || type === 'integer') {
      if (prop.minimum !== undefined) field.minimum = Number(prop.minimum);
      if (prop.maximum !== undefined) field.maximum = Number(prop.maximum);
    }

    if (Array.isArray(prop.enum)) {
      field.enum = prop.enum.map(String);
    }

    if (type === 'object' && prop.properties) {
      field.children = jsonSchemaToFields(prop);
    }

    if (type === 'array' && prop.items) {
      const items = prop.items as Record<string, unknown>;
      let itemType: SchemaField['type'] = 'string';
      if (Array.isArray(items.type)) {
        itemType = (items.type.filter((t: string) => t !== 'null')[0] || 'string') as SchemaField['type'];
      } else {
        itemType = (items.type || 'string') as SchemaField['type'];
      }

      field.items = {
        id: generateFieldId(),
        name: 'items',
        type: itemType,
        required: false,
      };
      if (itemType === 'object' && items.properties) {
        field.items.children = jsonSchemaToFields(items);
      }
      if (itemType === 'array' && items.items) {
        const nestedItems = items.items as Record<string, unknown>;
        field.items.items = {
          id: generateFieldId(),
          name: 'items',
          type: ((nestedItems.type || 'string') as SchemaField['type']),
          required: false,
        };
      }
    }

    fields.push(field);
  }

  return fields;
}

// ---- Generate extractors from schema fields ----

import type { FlowNodeExtractor } from '../../../types/flow';

/**
 * Recursively walk SchemaField[] and produce one FlowNodeExtractor per
 * extractable leaf. Objects are recursed into; arrays produce an extractor
 * for the whole array (useful for loops) plus one per item-child field.
 */
export function schemaFieldsToExtractors(
  fields: SchemaField[],
  prefix: string = '$',
): FlowNodeExtractor[] {
  const extractors: FlowNodeExtractor[] = [];

  for (const field of fields) {
    if (!field.name.trim()) continue;
    const path = `${prefix}.${field.name}`;

    if (field.type === 'object' && field.children?.length) {
      // Recurse into nested object properties
      extractors.push(...schemaFieldsToExtractors(field.children, path));
    } else if (field.type === 'array') {
      // Whole array — needed by loops
      extractors.push({ name: field.name, expression: path, type: 'jsonpath' });

      // If items are objects, also extract the first-level child fields
      if (field.items?.type === 'object' && field.items.children?.length) {
        for (const child of field.items.children) {
          if (!child.name.trim()) continue;
          extractors.push({
            name: `${field.name}_${child.name}`,
            expression: `${path}[*].${child.name}`,
            type: 'jsonpath',
          });
        }
      }
    } else {
      // Leaf (string, number, integer, boolean)
      extractors.push({ name: field.name, expression: path, type: 'jsonpath' });
    }
  }

  return extractors;
}

// ---- Infer schema from a real JSON response ----

function inferType(value: unknown): { type: SchemaField['type']; nullable: boolean } {
  if (value === null || value === undefined) return { type: 'string', nullable: true };
  if (typeof value === 'boolean') return { type: 'boolean', nullable: false };
  if (typeof value === 'number') {
    return { type: Number.isInteger(value) ? 'integer' : 'number', nullable: false };
  }
  if (typeof value === 'string') return { type: 'string', nullable: false };
  if (Array.isArray(value)) return { type: 'array', nullable: false };
  if (typeof value === 'object') return { type: 'object', nullable: false };
  return { type: 'string', nullable: false };
}

/**
 * Infer SchemaField[] from a real JSON response.
 * Recursively analyses objects and arrays, sampling the first array element.
 * All fields are marked required by default.
 */
export function jsonResponseToFields(value: unknown): SchemaField[] {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      return jsonResponseToFields(value[0]);
    }
    return [];
  }

  if (typeof value !== 'object') return [];

  const fields: SchemaField[] = [];

  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const { type, nullable } = inferType(val);

    const field: SchemaField = {
      id: generateFieldId(),
      name: key,
      type,
      required: true,
      nullable,
    };

    if (type === 'object' && val !== null && typeof val === 'object' && !Array.isArray(val)) {
      field.children = jsonResponseToFields(val);
    }

    if (type === 'array' && Array.isArray(val)) {
      if (val.length > 0) {
        const sample = val[0];
        const itemInfer = inferType(sample);
        field.items = {
          id: generateFieldId(),
          name: 'items',
          type: itemInfer.type,
          required: false,
          nullable: itemInfer.nullable,
        };
        if (itemInfer.type === 'object' && sample !== null && typeof sample === 'object') {
          field.items.children = jsonResponseToFields(sample);
        }
        if (itemInfer.type === 'array' && Array.isArray(sample) && sample.length > 0) {
          const nestedSample = sample[0];
          const nestedInfer = inferType(nestedSample);
          field.items.items = {
            id: generateFieldId(),
            name: 'items',
            type: nestedInfer.type,
            required: false,
          };
        }
      } else {
        field.items = {
          id: generateFieldId(),
          name: 'items',
          type: 'string',
          required: false,
        };
      }
    }

    fields.push(field);
  }

  return fields;
}
