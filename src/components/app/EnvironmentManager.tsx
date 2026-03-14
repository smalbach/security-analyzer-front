import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import type { ProjectEnvironment, EnvironmentVariable } from '../../types/environments';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface EnvironmentManagerProps {
  projectId: string;
  onClose: () => void;
}

function VariableEditor({
  variables,
  onChange,
  onReveal,
}: {
  variables: EnvironmentVariable[];
  onChange: (vars: EnvironmentVariable[]) => void;
  onReveal: () => void;
}) {
  const addRow = () => {
    onChange([...variables, { key: '', defaultValue: '', currentValue: '', sensitive: false, enabled: true }]);
  };

  const updateRow = (index: number, patch: Partial<EnvironmentVariable>) => {
    onChange(variables.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const removeRow = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const resetToDefault = (index: number) => {
    updateRow(index, { currentValue: variables[index].defaultValue });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="w-6" />
        <span className="w-32">Key</span>
        <span className="flex-1">Default Value</span>
        <span className="flex-1">Current Value</span>
        <span className="w-16 text-center">Type</span>
        <span className="w-14" />
      </div>

      {variables.map((v, i) => {
        const isMasked = v.sensitive && (v.defaultValue === '••••••••' || v.currentValue === '••••••••');
        const currentDiffers = v.currentValue !== v.defaultValue && !isMasked;

        return (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateRow(i, { enabled: !v.enabled })}
              className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                v.enabled
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-white/20 bg-transparent'
              }`}
              title={v.enabled ? 'Disable' : 'Enable'}
            />

            <Input
              value={v.key}
              onChange={(e) => updateRow(i, { key: e.target.value })}
              placeholder="KEY"
              className="w-32 shrink-0 rounded-lg px-2 py-1 font-mono text-xs"
            />

            <div className="relative min-w-0 flex-1">
              <Input
                type={v.sensitive && isMasked ? 'password' : 'text'}
                value={v.defaultValue}
                onChange={(e) => updateRow(i, { defaultValue: e.target.value })}
                placeholder="default value"
                className="w-full rounded-lg px-2 py-1 font-mono text-xs"
              />
            </div>

            <div className="relative min-w-0 flex-1">
              <Input
                type={v.sensitive && isMasked ? 'password' : 'text'}
                value={v.currentValue}
                onChange={(e) => updateRow(i, { currentValue: e.target.value })}
                placeholder="current value"
                className={`w-full rounded-lg px-2 py-1 font-mono text-xs ${
                  currentDiffers ? 'border-amber-500/30 bg-amber-500/5' : ''
                }`}
              />
              {currentDiffers && (
                <button
                  type="button"
                  onClick={() => resetToDefault(i)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1 text-[10px] text-amber-400 hover:text-amber-300"
                  title="Reset to default"
                >
                  reset
                </button>
              )}
              {v.sensitive && isMasked && (
                <button
                  type="button"
                  onClick={onReveal}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1 text-[10px] text-slate-500 hover:text-slate-300"
                  title="Reveal value"
                >
                  eye
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => updateRow(i, { sensitive: !v.sensitive })}
              className={`flex w-16 items-center justify-center rounded-lg border px-1.5 py-1 text-[10px] transition-colors ${
                v.sensitive
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-white/10 text-slate-500 hover:text-slate-400'
              }`}
              title={v.sensitive ? 'Sensitive (encrypted)' : 'Not sensitive'}
            >
              {v.sensitive ? 'Secret' : 'Plain'}
            </button>

            <button
              type="button"
              onClick={() => removeRow(i)}
              className="shrink-0 text-xs text-slate-600 hover:text-red-400"
              title="Remove"
            >
              x
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-lg border border-dashed border-white/10 py-1.5 text-center text-xs text-slate-500 transition-colors hover:border-white/20 hover:text-slate-400"
      >
        + Add Variable
      </button>
    </div>
  );
}

export function EnvironmentManager({ projectId, onClose }: EnvironmentManagerProps) {
  const { api } = useAuth();
  const setActiveEnvInStore = useEnvironmentStore((s) => s.setActiveEnv);

  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editVars, setEditVars] = useState<EnvironmentVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const envs = await api.getEnvironments(projectId);
      setEnvironments(envs);
    } catch {
      setError('Failed to load environments');
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const handleEdit = async (env: ProjectEnvironment) => {
    setEditingId(env.id);
    setEditName(env.name);
    setError('');
    try {
      const revealed = await api.getEnvironment(projectId, env.id, true);
      setEditVars(revealed.variables);
    } catch {
      setEditVars(env.variables);
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      await api.updateEnvironment(projectId, editingId, {
        name: editName,
        variables: editVars,
      });
      setEditingId(null);
      void fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.createEnvironment(projectId, {
        name: newName.trim(),
        variables: [],
        isActive: environments.length === 0,
      });
      setNewName('');
      setCreating(false);
      void fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (envId: string) => {
    try {
      await api.deleteEnvironment(projectId, envId);
      if (editingId === envId) setEditingId(null);
      void fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleActivate = async (envId: string) => {
    try {
      const env = await api.activateEnvironment(projectId, envId);
      setActiveEnvInStore(projectId, env);
      void fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to activate');
    }
  };

  const handleReveal = async () => {
    if (!editingId) return;
    try {
      const revealed = await api.getEnvironment(projectId, editingId, true);
      setEditVars(revealed.variables);
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      title="Environment Manager"
      description="Each variable has a Default Value (initial/shared) and a Current Value (runtime, updated by scripts)."
      size="xl"
      onClose={onClose}
    >
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading environments...</p>
      ) : editingId ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              {'<'} Back
            </button>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 font-medium"
              placeholder="Environment name"
            />
          </div>

          <VariableEditor
            variables={editVars}
            onChange={setEditVars}
            onReveal={() => void handleReveal()}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {environments.map((env) => (
            <div
              key={env.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  env.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-300">{env.name}</p>
                <p className="text-[10px] text-slate-500">{env.variables.length} variables</p>
              </div>
              <div className="flex items-center gap-1.5">
                {!env.isActive && (
                  <button
                    type="button"
                    onClick={() => void handleActivate(env.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-500 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                  >
                    Activate
                  </button>
                )}
                {env.isActive && (
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400">
                    Active
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleEdit(env)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-500 transition-colors hover:text-slate-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(env.id)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-red-500/70 transition-colors hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {creating ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Environment name (e.g., Local, Development, Staging)"
                className="min-w-0 flex-1 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate();
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
              <Button size="sm" onClick={() => void handleCreate()} disabled={saving || !newName.trim()}>
                Create
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full rounded-xl border border-dashed border-white/10 py-3 text-center text-sm text-slate-500 transition-colors hover:border-white/20 hover:text-slate-400"
            >
              + New Environment
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
