import type { AuthConfig } from './auth';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  baseUrl: string | null;
  authConfig: AuthConfig | null;
  tags: string[];
  isArchived: boolean;
  lastRunSummary?: {
    securityScore?: number;
    globalRiskLevel?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: AuthConfig;
  tags?: string[];
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;
