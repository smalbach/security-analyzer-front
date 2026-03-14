import { create } from 'zustand';

export interface SessionToken {
  token: string;
  decodedPayload: Record<string, unknown> | null;
  expiresAt: number | null;
  capturedAt: number;
}

interface SessionTokenState {
  tokens: Record<string, SessionToken>;
  setToken: (projectId: string, token: string) => void;
  getToken: (projectId: string) => SessionToken | null;
  clearToken: (projectId: string) => void;
  clearAll: () => void;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
}

export const useSessionTokenStore = create<SessionTokenState>((set, get) => ({
  tokens: {},

  setToken: (projectId: string, token: string) => {
    const decoded = decodeJwtPayload(token);
    const exp = decoded?.exp;
    const expiresAt = typeof exp === 'number' ? exp * 1000 : null;

    set((state) => ({
      tokens: {
        ...state.tokens,
        [projectId]: {
          token,
          decodedPayload: decoded,
          expiresAt,
          capturedAt: Date.now(),
        },
      },
    }));
  },

  getToken: (projectId: string) => {
    return get().tokens[projectId] ?? null;
  },

  clearToken: (projectId: string) => {
    set((state) => {
      const { [projectId]: _, ...rest } = state.tokens;
      return { tokens: rest };
    });
  },

  clearAll: () => {
    set({ tokens: {} });
  },
}));
