import { create } from 'zustand';
import type { TestEndpointResponse } from '../types/api';

export interface CachedResponse {
  response: TestEndpointResponse;
  cachedAt: number;
}

interface ResponseCacheState {
  /** Keyed by `${projectId}::${endpointId}` */
  cache: Record<string, CachedResponse>;
  setResponse: (projectId: string, endpointId: string, response: TestEndpointResponse) => void;
  getResponse: (projectId: string, endpointId: string) => CachedResponse | null;
  clearResponse: (projectId: string, endpointId: string) => void;
  clearProject: (projectId: string) => void;
  clearAll: () => void;
}

function cacheKey(projectId: string, endpointId: string) {
  return `${projectId}::${endpointId}`;
}

export const useResponseCacheStore = create<ResponseCacheState>((set, get) => ({
  cache: {},

  setResponse: (projectId, endpointId, response) => {
    const key = cacheKey(projectId, endpointId);
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { response, cachedAt: Date.now() },
      },
    }));
  },

  getResponse: (projectId, endpointId) => {
    return get().cache[cacheKey(projectId, endpointId)] ?? null;
  },

  clearResponse: (projectId, endpointId) => {
    const key = cacheKey(projectId, endpointId);
    set((state) => {
      const { [key]: _, ...rest } = state.cache;
      return { cache: rest };
    });
  },

  clearProject: (projectId) => {
    const prefix = `${projectId}::`;
    set((state) => {
      const filtered: Record<string, CachedResponse> = {};
      for (const [k, v] of Object.entries(state.cache)) {
        if (!k.startsWith(prefix)) filtered[k] = v;
      }
      return { cache: filtered };
    });
  },

  clearAll: () => set({ cache: {} }),
}));
