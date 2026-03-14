export interface EnvironmentVariable {
  key: string;
  defaultValue: string;
  currentValue: string;
  sensitive: boolean;
  enabled: boolean;
}

export interface ProjectEnvironment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  variables?: EnvironmentVariable[];
  isActive?: boolean;
}

export interface UpdateEnvironmentRequest {
  name?: string;
  variables?: EnvironmentVariable[];
  isActive?: boolean;
}
