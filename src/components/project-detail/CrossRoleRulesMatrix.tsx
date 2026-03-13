import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { CrossRoleDataRule, CrossRoleRuleItem, ProjectRole } from '../../types/api';
import { Button } from '../ui';

interface CellState {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

type MatrixState = Record<string, Record<string, CellState>>;

function emptyCell(): CellState {
  return { canRead: false, canWrite: false, canDelete: false };
}

interface CrossRoleRulesMatrixProps {
  projectId: string;
  roles: ProjectRole[];
}

export function CrossRoleRulesMatrix({ projectId, roles }: CrossRoleRulesMatrixProps) {
  const { api } = useAuth();
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Initialize matrix from DB rules
  useEffect(() => {
    if (roles.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getCrossRoleRules(projectId)
      .then((rules: CrossRoleDataRule[]) => {
        const initial: MatrixState = {};
        for (const targetRole of roles) {
          initial[targetRole.id] = {};
          for (const sourceRole of roles) {
            if (sourceRole.id === targetRole.id) continue;
            const rule = rules.find(
              (r) => r.sourceRoleId === sourceRole.id && r.targetRoleId === targetRole.id && !r.endpointId,
            );
            initial[targetRole.id][sourceRole.id] = rule
              ? { canRead: rule.canRead, canWrite: rule.canWrite, canDelete: rule.canDelete }
              : emptyCell();
          }
        }
        setMatrix(initial);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load rules'))
      .finally(() => setLoading(false));
  }, [api, projectId, roles]);

  const toggleCell = (targetRoleId: string, sourceRoleId: string, field: keyof CellState) => {
    setMatrix((prev) => ({
      ...prev,
      [targetRoleId]: {
        ...prev[targetRoleId],
        [sourceRoleId]: {
          ...((prev[targetRoleId]?.[sourceRoleId]) ?? emptyCell()),
          [field]: !prev[targetRoleId]?.[sourceRoleId]?.[field],
        },
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const rules: CrossRoleRuleItem[] = [];
      for (const targetRole of roles) {
        for (const sourceRole of roles) {
          if (sourceRole.id === targetRole.id) continue;
          const cell = matrix[targetRole.id]?.[sourceRole.id] ?? emptyCell();
          rules.push({
            sourceRoleId: sourceRole.id,
            targetRoleId: targetRole.id,
            endpointId: null,
            canRead: cell.canRead,
            canWrite: cell.canWrite,
            canDelete: cell.canDelete,
          });
        }
      }
      await api.saveCrossRoleRules(projectId, rules);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  if (roles.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
        <p className="text-sm text-slate-500">Add at least 2 roles to configure cross-role rules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-300">Cross-role data rules</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Define what data a role (row) can access when it was created by another role (column).
            These expectations are validated during cross-user permutation tests.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saved ? <span className="text-xs text-emerald-400">Saved.</span> : null}
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-slate-500">
                  <span className="block">Target role</span>
                  <span className="text-[10px] text-slate-600">↓ accesses data created by →</span>
                </th>
                {roles.map((sourceRole) => (
                  <th key={sourceRole.id} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: sourceRole.color ?? '#6366f1' }}
                      />
                      <span className="font-semibold text-slate-300">{sourceRole.name}</span>
                      <span className="text-[10px] text-slate-500">R / W / D</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((targetRole) => (
                <tr key={targetRole.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: targetRole.color ?? '#6366f1' }}
                      />
                      <span className="font-semibold text-slate-200">{targetRole.name}</span>
                    </div>
                    {targetRole.sameRoleDataIsolation ? (
                      <span className="mt-1 block text-[10px] text-amber-400">⚠ Isolation on</span>
                    ) : null}
                  </td>
                  {roles.map((sourceRole) => {
                    if (sourceRole.id === targetRole.id) {
                      return (
                        <td key={sourceRole.id} className="px-4 py-3 text-center">
                          <span className="text-slate-600">—</span>
                        </td>
                      );
                    }
                    const cell = matrix[targetRole.id]?.[sourceRole.id] ?? emptyCell();
                    return (
                      <td key={sourceRole.id} className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <TogglePill
                            label="R"
                            active={cell.canRead}
                            title="Can Read"
                            colorClass="bg-emerald-500/30 text-emerald-300"
                            onClick={() => toggleCell(targetRole.id, sourceRole.id, 'canRead')}
                          />
                          <TogglePill
                            label="W"
                            active={cell.canWrite}
                            title="Can Write"
                            colorClass="bg-blue-500/30 text-blue-300"
                            onClick={() => toggleCell(targetRole.id, sourceRole.id, 'canWrite')}
                          />
                          <TogglePill
                            label="D"
                            active={cell.canDelete}
                            title="Can Delete"
                            colorClass="bg-red-500/30 text-red-300"
                            onClick={() => toggleCell(targetRole.id, sourceRole.id, 'canDelete')}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-600">
        R = Read · W = Write/Update · D = Delete · — = Same role (use &quot;isolated&quot; setting instead)
      </p>
    </div>
  );
}

function TogglePill({
  label,
  active,
  title,
  colorClass,
  onClick,
}: {
  label: string;
  active: boolean;
  title: string;
  colorClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded font-bold transition-all ${
        active ? colorClass : 'bg-white/5 text-slate-600 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}
