export type DataScope = 'all' | 'own' | 'none';

export interface ProjectRole {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  sameRoleDataIsolation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRoleRequest {
  name: string;
  description?: string;
  color?: string;
  sameRoleDataIsolation?: boolean;
}

export type UpdateProjectRoleRequest = Partial<CreateProjectRoleRequest>;

export interface RoleEndpointPermission {
  id: string;
  roleId: string;
  endpointId: string;
  hasAccess: boolean;
  dataScope: DataScope;
}

export interface RoleEndpointPermissionItem {
  endpointId: string;
  hasAccess: boolean;
  dataScope: DataScope;
}

export interface CrossRoleDataRule {
  id: string;
  projectId: string;
  sourceRoleId: string;
  targetRoleId: string;
  endpointId?: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  sourceRole?: { id: string; name: string };
  targetRole?: { id: string; name: string };
}

export interface CrossRoleRuleItem {
  sourceRoleId: string;
  targetRoleId: string;
  endpointId?: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface EndpointRoleAccess {
  roleId: string;
  roleName: string;
  color?: string | null;
  hasAccess: boolean;
  dataScope: DataScope;
}
