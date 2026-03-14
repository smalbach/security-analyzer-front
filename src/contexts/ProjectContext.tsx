import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { Project } from '../types/api';

export interface ProjectContextValue {
  project: Project | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  setProject: Dispatch<SetStateAction<Project | null>>;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext must be used inside ProjectShell');
  return ctx;
}

/** Safe version — returns null when used outside a project route */
export function useOptionalProjectContext(): ProjectContextValue | null {
  return useContext(ProjectContext);
}
