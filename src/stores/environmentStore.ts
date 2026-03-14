import { create } from 'zustand';
import type { ProjectEnvironment } from '../types/environments';

interface EnvironmentStoreState {
  activeEnvs: Record<string, ProjectEnvironment>;
  setActiveEnv: (projectId: string, env: ProjectEnvironment) => void;
  getActiveEnv: (projectId: string) => ProjectEnvironment | null;
  invalidate: (projectId: string) => void;
  invalidateAll: () => void;
}

export const useEnvironmentStore = create<EnvironmentStoreState>((set, get) => ({
  activeEnvs: {},

  setActiveEnv: (projectId: string, env: ProjectEnvironment) => {
    set((state) => ({
      activeEnvs: { ...state.activeEnvs, [projectId]: env },
    }));
  },

  getActiveEnv: (projectId: string) => {
    return get().activeEnvs[projectId] ?? null;
  },

  invalidate: (projectId: string) => {
    set((state) => {
      const { [projectId]: _, ...rest } = state.activeEnvs;
      return { activeEnvs: rest };
    });
  },

  invalidateAll: () => {
    set({ activeEnvs: {} });
  },
}));
