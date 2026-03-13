import type { ProjectRole } from '../../types/api';
import { Button } from '../ui';

interface RoleListProps {
  roles: ProjectRole[];
  selectedRoleId: string | null;
  onSelect: (role: ProjectRole) => void;
  onEdit: (role: ProjectRole) => void;
  onDelete: (role: ProjectRole) => void;
  onAdd: () => void;
}

export function RoleList({
  roles,
  selectedRoleId,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
}: RoleListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Roles</h3>
        <Button variant="link" size="sm" onClick={onAdd}>
          + Add role
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-slate-500">No roles configured.</p>
          <p className="mt-1 text-xs text-slate-600">
            Add roles to define access expectations for test runs.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={role.id === selectedRoleId}
              onSelect={() => onSelect(role)}
              onEdit={() => onEdit(role)}
              onDelete={() => onDelete(role)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RoleCardProps {
  role: ProjectRole;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleCard({ role, isSelected, onSelect, onEdit, onDelete }: RoleCardProps) {
  return (
    <div
      className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
        isSelected
          ? 'border-tide-400/40 bg-tide-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Color swatch */}
      <span
        className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
        style={{ backgroundColor: role.color ?? '#6366f1' }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200">{role.name}</span>
          {role.sameRoleDataIsolation ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Isolated
            </span>
          ) : null}
        </div>
        {role.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{role.description}</p>
        ) : null}
      </div>

      {/* Actions (visible on hover or when selected) */}
      <div
        className={`flex shrink-0 gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="xs"
          onClick={onEdit}
          title="Edit role"
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="xs"
          onClick={onDelete}
          title="Delete role"
        >
          Del
        </Button>
      </div>
    </div>
  );
}
