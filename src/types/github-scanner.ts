import type { EndpointParameters } from './endpoints';

export interface GitHubConnection {
  id: string;
  projectId: string;
  repoUrl: string;
  branch: string;
  backendType: string;
  basePath: string | null;
  globalPrefix: string | null;
  lastSyncedAt: string | null;
  lastCommitSha: string | null;
  status: 'connected' | 'scanning' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface ConnectGitHubRequest {
  repoUrl: string;
  branch?: string;
  accessToken?: string;
  backendType: string;
  basePath?: string;
  globalPrefix?: string;
}

export interface ScannedEndpoint {
  sourceKey: string;
  sourceFile: string;
  method: string;
  path: string;
  fullPath: string;
  description: string | null;
  parameters: EndpointParameters | null;
  requiresAuth: boolean;
  tags: string[];
  roles: string[];
  guards: string[];
  responseSchemas: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SyncFieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface SyncDiffItem {
  type: 'added' | 'modified' | 'removed' | 'unchanged';
  endpointKey: string;
  existing?: {
    id: string;
    method: string;
    path: string;
    description: string | null;
  };
  scanned?: ScannedEndpoint;
  fieldChanges?: SyncFieldChange[];
}

export interface SyncSummary {
  added: number;
  modified: number;
  removed: number;
  unchanged: number;
}

export interface SyncResult {
  connectionId: string;
  commitSha: string;
  diff: SyncDiffItem[];
  summary: SyncSummary;
}

export interface SyncActionItem {
  endpointKey: string;
  action: 'auto' | 'skip';
}

export interface ImpactAnalysis {
  flows: Array<{
    flowId: string;
    flowName: string;
    nodeId: string;
    nodeLabel: string;
  }>;
  rolePermissions: Array<{
    roleId: string;
    roleName: string;
    permissionId: string;
  }>;
}

export interface ApplyImpactRequest {
  newEndpointId: string;
  updateFlows?: boolean;
  updateRolePermissions?: boolean;
}

export interface SyncHistory {
  id: string;
  connectionId: string;
  commitSha: string;
  status: 'pending' | 'completed' | 'failed';
  summary: SyncSummary | null;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    endpointKey: string;
    details: Record<string, unknown>;
  }> | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}
