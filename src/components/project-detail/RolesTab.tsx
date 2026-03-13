import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { ApiEndpoint, CreateProjectRoleRequest, Project, ProjectRole, UpdateProjectRoleRequest } from '../../types/api';
import { CrossRoleRulesMatrix } from './CrossRoleRulesMatrix';
import { RoleFormModal } from './RoleFormModal';
import { RoleList } from './RoleList';
import { RolePermissionsPanel } from './RolePermissionsPanel';

interface RolesTabProps {
  project: Project;
}

type ModalMode = { type: 'create' } | { type: 'edit'; role: ProjectRole };

export function RolesTab({ project }: RolesTabProps) {
  const { api } = useAuth();
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const [rolesData, endpointsData] = await Promise.all([
        api.getRoles(project.id),
        api.getEndpoints(project.id),
      ]);
      setRoles(rolesData);
      setEndpoints(endpointsData);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const handleSave = async (data: CreateProjectRoleRequest | UpdateProjectRoleRequest) => {
    if (!modal) return;
    if (modal.type === 'create') {
      const created = await api.createRole(project.id, data as CreateProjectRoleRequest);
      setRoles((prev) => [...prev, created]);
      setSelectedRole(created);
    } else {
      const updated = await api.updateRole(project.id, modal.role.id, data);
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRole?.id === updated.id) setSelectedRole(updated);
    }
    setModal(null);
  };

  const handleDelete = async (role: ProjectRole) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteRole(project.id, role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRole?.id === role.id) setSelectedRole(null);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-slate-500">Loading roles…</div>;
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {/* ── Role list + permissions ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <RoleList
          roles={roles}
          selectedRoleId={selectedRole?.id ?? null}
          onSelect={setSelectedRole}
          onEdit={(role) => setModal({ type: 'edit', role })}
          onDelete={(role) => void handleDelete(role)}
          onAdd={() => setModal({ type: 'create' })}
        />

        <div className="min-w-0">
          {selectedRole ? (
            <RolePermissionsPanel
              key={selectedRole.id}
              projectId={project.id}
              role={selectedRole}
              endpoints={endpoints}
            />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-white/10">
              <p className="text-sm text-slate-500">Select a role to configure its endpoint permissions.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cross-role rules matrix ─────────────────────────────────────── */}
      {roles.length >= 2 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <CrossRoleRulesMatrix projectId={project.id} roles={roles} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 py-6 text-center">
          <p className="text-sm text-slate-500">Add at least 2 roles to configure cross-role data rules.</p>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {modal ? (
        <RoleFormModal
          projectId={project.id}
          role={modal.type === 'edit' ? modal.role : undefined}
          onSave={(data) => handleSave(data)}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
