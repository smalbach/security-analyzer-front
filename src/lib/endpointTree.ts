import type { ApiEndpoint } from '../types/api';

export const VERSION_PREFIX_REGEX = /^v\d+$/i;

export interface EndpointTreeNode {
  id: string;
  label: string;
  fullPath: string;
  children: EndpointTreeNode[];
  endpoints: ApiEndpoint[];
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function normalizePathSegments(rawPath: string): string[] {
  return rawPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => decodePathSegment(segment));
}

export function getPathTreeSegments(endpointPath: string): string[] {
  const segments = normalizePathSegments(endpointPath);

  if (segments.length === 0) {
    return ['(root)'];
  }

  if (segments.length >= 2 && VERSION_PREFIX_REGEX.test(segments[0])) {
    const [, resource, ...rest] = segments;
    return [resource, segments[0].toLowerCase(), ...rest];
  }

  return segments;
}

export function getDisplayPath(endpointPath: string): string {
  const segments = normalizePathSegments(endpointPath);
  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`;
}

export function buildEndpointTree(endpoints: ApiEndpoint[]): EndpointTreeNode[] {
  type MutableNode = {
    id: string;
    label: string;
    fullPath: string;
    children: Map<string, MutableNode>;
    endpoints: ApiEndpoint[];
  };

  const root = new Map<string, MutableNode>();

  for (const endpoint of endpoints) {
    const treeSegments = getPathTreeSegments(endpoint.path);

    let parent = root;
    let currentPath = '';
    let currentNode: MutableNode | null = null;

    for (let index = 0; index < treeSegments.length; index += 1) {
      const segment = treeSegments[index];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const key = `${index}:${segment}`;
      const existing = parent.get(key);

      if (existing) {
        currentNode = existing;
        parent = existing.children;
        continue;
      }

      const created: MutableNode = {
        id: currentPath,
        label: segment,
        fullPath: currentPath,
        children: new Map<string, MutableNode>(),
        endpoints: [],
      };

      parent.set(key, created);
      currentNode = created;
      parent = created.children;
    }

    if (currentNode) {
      currentNode.endpoints.push(endpoint);
    }
  }

  const toImmutable = (nodes: Map<string, MutableNode>): EndpointTreeNode[] =>
    Array.from(nodes.values())
      .map((node) => ({
        id: node.id,
        label: node.label,
        fullPath: node.fullPath,
        children: toImmutable(node.children),
        endpoints: [...node.endpoints].sort((a, b) => {
          const methodCompare = a.method.localeCompare(b.method);
          return methodCompare !== 0 ? methodCompare : a.path.localeCompare(b.path);
        }),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return toImmutable(root);
}

export function countNodeEndpoints(node: EndpointTreeNode): number {
  return node.endpoints.length + node.children.reduce((total, child) => total + countNodeEndpoints(child), 0);
}

/** Recursively collect all endpoint IDs within a node and its descendants. */
export function getAllEndpointIds(node: EndpointTreeNode): string[] {
  return [
    ...node.endpoints.map((ep) => ep.id),
    ...node.children.flatMap((child) => getAllEndpointIds(child)),
  ];
}
