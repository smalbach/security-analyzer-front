import { useCallback, useEffect, useState } from 'react';
import { CreateProjectModal, ProjectCard } from '../components/projects';
import { Button, EmptyState } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { isUnauthorizedError } from '../lib/api';
import type { Project } from '../types/api';

export function ProjectsPage() {
  const { api } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.getProjects({ limit: 50 });
      setProjects(response.data ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) {
      return;
    }

    try {
      await api.deleteProject(projectId);
      setProjects((previous) => previous.filter((project) => project.id !== projectId));
    } catch (deleteError) {
      if (isUnauthorizedError(deleteError)) {
        return;
      }
      alert(deleteError instanceof Error ? deleteError.message : 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Projects</h1>
            <p className="mt-1 text-sm text-slate-200/85">
              Manage your API projects and run security tests.
            </p>
          </div>

          <Button
            size="lg"
            className="rounded-2xl px-5 py-2.5 shadow-glow"
            onClick={() => setShowCreateModal(true)}
          >
            New Project
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet."
          description="Create your first project to import endpoints and start running security checks."
          action={
            <Button variant="link" onClick={() => setShowCreateModal(true)}>
              Create your first project
            </Button>
          }
          className="py-20"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={(projectId) => void handleDelete(projectId)}
            />
          ))}
        </div>
      )}

      {showCreateModal ? (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(project) => {
            setProjects((previous) => [project, ...previous]);
            setShowCreateModal(false);
          }}
        />
      ) : null}
    </div>
  );
}
