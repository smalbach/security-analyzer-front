import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Project } from '../../../types/api';
import { useAuth } from '../../../contexts/AuthContext';
import { isUnauthorizedError } from '../../../lib/api';
import { getErrorMessage } from '../../../shared/utils/error';

interface UseProjectResult {
  project: Project | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
  setProject: Dispatch<SetStateAction<Project | null>>;
}

export function useProject(projectId?: string): UseProjectResult {
  const { api } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nextProject = await api.getProject(projectId);
      setProject(nextProject);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        return;
      }

      setError(getErrorMessage(loadError, 'Failed to load project'));
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    project,
    loading,
    error,
    refetch,
    setProject,
  };
}
