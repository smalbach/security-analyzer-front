import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../../../types/api';
import { useAuth } from '../../../contexts/AuthContext';
import { isUnauthorizedError } from '../../../lib/api';
import { getErrorMessage } from '../../../shared/utils/error';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  prependProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
}

export function useProjects(): UseProjectsResult {
  const { api } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.getProjects({ limit: 50 });
      setProjects(response.data ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        return;
      }

      setError(getErrorMessage(loadError, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const prependProject = useCallback((project: Project) => {
    setProjects((current) => [project, ...current]);
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects((current) => current.filter((project) => project.id !== projectId));
  }, []);

  return {
    projects,
    loading,
    error,
    refetch,
    prependProject,
    removeProject,
  };
}
