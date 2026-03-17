export interface ImportableProject {
  id: string;
  name: string;
  description: string | null;
  endpointCount: number;
  flowCount: number;
  environmentCount: number;
}

export interface ImportFromProjectRequest {
  sourceProjectId: string;
  endpointIds?: string[];
  flowIds?: string[];
  environmentIds?: string[];
}

export interface ImportFromProjectResult {
  endpoints: { imported: number };
  flows: { imported: number };
  environments: { imported: number };
}
