import { useState } from 'react';
import { CreateProjectModal, ProjectCard } from '../components/projects';
import { Button, EmptyState } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../features/projects/hooks';
import { isUnauthorizedError } from '../lib/api';
import { getErrorMessage } from '../shared/utils/error';

export function ProjectsPage() {
  const { api } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const { projects, loading, error, removeProject, prependProject } = useProjects({ archived: showArchived });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleArchive = async (projectId: string) => {
    try {
      await api.archiveProject(projectId);
      removeProject(projectId);
    } catch (archiveError) {
      if (isUnauthorizedError(archiveError)) {
        return;
      }
      alert(getErrorMessage(archiveError, 'Failed to archive project'));
    }
  };

  const handleUnarchive = async (projectId: string) => {
    try {
      await api.unarchiveProject(projectId);
      removeProject(projectId);
    } catch (unarchiveError) {
      if (isUnauthorizedError(unarchiveError)) {
        return;
      }
      alert(getErrorMessage(unarchiveError, 'Failed to restore project'));
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

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  !showArchived
                    ? 'bg-white/10 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  showArchived
                    ? 'bg-white/10 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Archived
              </button>
            </div>

            {!showArchived ? (
              <Button
                size="lg"
                className="rounded-2xl px-5 py-2.5 shadow-glow"
                onClick={() => setShowCreateModal(true)}
              >
                New Project
              </Button>
            ) : null}
          </div>
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
        showArchived ? (
          <EmptyState
            title="No archived projects."
            description="Archived projects will appear here. You can restore them at any time."
            className="py-20"
          />
        ) : (
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
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={(projectId) => void handleArchive(projectId)}
              onUnarchive={(projectId) => void handleUnarchive(projectId)}
            />
          ))}
        </div>
      )}

      {showCreateModal ? (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(project) => {
            prependProject(project);
            setShowCreateModal(false);
          }}
        />
      ) : null}
    </div>
  );
}
