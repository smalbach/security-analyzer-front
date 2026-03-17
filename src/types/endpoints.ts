export interface PathParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'uuid';
  required: boolean;
  description?: string;
  example?: string;
}

export interface QueryParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  example?: string;
  enum?: string[];
}

export interface HeaderParam {
  name: string;
  value: string;
  required: boolean;
}

export interface BodySchema {
  content_type: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

export interface EndpointParameters {
  path?: PathParam[];
  query?: QueryParam[];
  headers?: HeaderParam[];
  body?: BodySchema;
}

export type EndpointStatus = 'active' | 'archived' | 'inactive';

export interface ApiEndpoint {
  id: string;
  projectId: string;
  method: string;
  path: string;
  description: string | null;
  parameters: EndpointParameters | null;
  requiresAuth: boolean;
  tags: string[];
  status: EndpointStatus;
  orderIndex: number;
  preRequestScript: string | null;
  postResponseScript: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEndpointRequest {
  method: string;
  path: string;
  description?: string;
  parameters?: EndpointParameters;
  requiresAuth?: boolean;
  tags?: string[];
  orderIndex?: number;
  preRequestScript?: string;
  postResponseScript?: string;
}

export interface TestEndpointRequest {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  authToken?: string;
  baseUrl?: string;
  rules?: string[];
  environmentId?: string;
}

export interface TestEndpointResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  url: string;
  method: string;
  capturedToken?: string;
  resolvedUrl?: string;
}

export interface ImportResult {
  imported: number;
  format: string;
  endpoints: ApiEndpoint[];
}

export interface PaginatedEndpointsResponse {
  data: ApiEndpoint[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
