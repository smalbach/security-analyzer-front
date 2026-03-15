import type {
  CreateEndpointRequest,
  EndpointParameters,
  RuleSelection,
  TestEndpointRequest,
} from '../../types/api';
import type { KVPair } from './types';

export function parseBodyText(bodyText: string): unknown {
  if (!bodyText) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

export function getDetectedPathParams(path?: string) {
  return Array.from(path?.matchAll(/\{(\w+)\}/g) ?? []).map((match) => match[1]);
}

export function buildEndpointParameters(queryRows: KVPair[], headerRows: KVPair[], bodyText: string): EndpointParameters {
  return {
    query: queryRows
      .filter((row) => row.key)
      .map((row) => ({
        name: row.key,
        type: 'string' as const,
        required: false,
        example: row.value,
      })),
    headers: headerRows
      .filter((row) => row.key)
      .map((row) => ({
        name: row.key,
        value: row.value,
        required: false,
      })),
    body: bodyText
      ? {
          content_type: 'application/json',
          example: parseBodyText(bodyText),
        }
      : undefined,
  };
}

export function buildEndpointPayload(
  endpoint: Partial<CreateEndpointRequest>,
  queryRows: KVPair[],
  headerRows: KVPair[],
  bodyText: string,
  preRequestScript: string,
  postResponseScript: string,
): CreateEndpointRequest {
  return {
    method: endpoint.method ?? 'GET',
    path: endpoint.path ?? '/',
    description: endpoint.description,
    requiresAuth: endpoint.requiresAuth,
    tags: endpoint.tags,
    parameters: buildEndpointParameters(queryRows, headerRows, bodyText),
    preRequestScript: preRequestScript || undefined,
    postResponseScript: postResponseScript || undefined,
  };
}

export function buildTestEndpointPayload(
  pathParams: Record<string, string>,
  queryRows: KVPair[],
  headerRows: KVPair[],
  bodyText: string,
  authToken: string,
  selectedRules: RuleSelection,
): TestEndpointRequest {
  return {
    pathParams: { ...pathParams },
    queryParams: Object.fromEntries(
      queryRows.filter((row) => row.enabled && row.key).map((row) => [row.key, row.value]),
    ),
    headers: Object.fromEntries(
      headerRows.filter((row) => row.enabled && row.key).map((row) => [row.key, row.value]),
    ),
    body: parseBodyText(bodyText),
    authToken: authToken || undefined,
    rules: Object.entries(selectedRules)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  };
}
