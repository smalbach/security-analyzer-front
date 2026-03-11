import type { PreviewData, PreviewEndpoint } from '../types/api';

export type PreviewGetFilters = {
  search: string;
  auth: 'all' | 'requires_auth' | 'public';
  body: 'all' | 'has_body' | 'no_body';
};

export const DEFAULT_PREVIEW_GET_FILTERS: PreviewGetFilters = {
  search: '',
  auth: 'all',
  body: 'all',
};

export function getPreviewGetEndpoints(preview?: PreviewData | null): PreviewEndpoint[] {
  if (!preview?.endpoints?.length) {
    return [];
  }

  return preview.endpoints.filter((endpoint) => endpoint.method === 'GET');
}

export function filterPreviewGetEndpoints(
  endpoints: PreviewEndpoint[],
  filters: PreviewGetFilters,
): PreviewEndpoint[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return endpoints.filter((endpoint) => {
    if (filters.auth === 'requires_auth' && !endpoint.requiresAuth) {
      return false;
    }

    if (filters.auth === 'public' && endpoint.requiresAuth) {
      return false;
    }

    if (filters.body === 'has_body' && !endpoint.hasBody) {
      return false;
    }

    if (filters.body === 'no_body' && endpoint.hasBody) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = `${endpoint.endpointId} ${endpoint.url}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}
