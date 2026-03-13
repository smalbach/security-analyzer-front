import { useState, type FormEvent } from 'react';
import type { ProjectRole, CreateProjectRoleRequest } from '../../types/api';
import { Button, FormField, Input, Modal } from '../ui';

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

interface RoleFormModalProps {
  projectId: string;
  role?: ProjectRole | null;
  onSave: (data: CreateProjectRoleRequest) => Promise<void>;
  onClose: () => void;
}

export function RoleFormModal({ role, onSave, onClose }: RoleFormModalProps) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [color, setColor] = useState(role?.color ?? PRESET_COLORS[0]);
  const [sameRoleDataIsolation, setSameRoleDataIsolation] = useState(
    role?.sameRoleDataIsolation ?? false,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(role);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
        sameRoleDataIsolation,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Role' : 'New Role'}
      description="Define a role and its data visibility behavior for cross-user testing."
      size="md"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="role-form" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      }
    >
      <form id="role-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <FormField label="Role name" htmlFor="role-name">
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="admin"
            maxLength={100}
            required
          />
        </FormField>

        <FormField label="Description (optional)" htmlFor="role-description">
          <Input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Full access administrator"
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Color</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-7 w-7 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'white' : 'transparent',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                }}
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
          <input
            type="checkbox"
            checked={sameRoleDataIsolation}
            onChange={(e) => setSameRoleDataIsolation(e.target.checked)}
            className="mt-0.5 accent-tide-400"
          />
          <div>
            <p className="text-sm font-medium text-slate-200">Same-role data isolation</p>
            <p className="mt-0.5 text-xs text-slate-500">
              If enabled, two users with this role should only see their own data (not each other's).
              This expectation will be validated during cross-user permutation tests.
            </p>
          </div>
        </label>
      </form>
    </Modal>
  );
}
