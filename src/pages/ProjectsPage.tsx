import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Project, CreateProjectRequest } from '../types/api';


function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="group relative cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl transition hover:border-tide-400/30 hover:bg-white/8"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-100">{project.name}</h3>
          {project.description && (
            <p className="mt-1 truncate text-sm text-slate-400">{project.description}</p>
          )}
          {project.baseUrl && (
            <p className="mt-1 truncate font-mono text-xs text-tide-400">{project.baseUrl}</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.id);
          }}
          className="hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/20 hover:text-red-400 group-hover:flex"
          title="Delete project"
        >
          ✕
        </button>
      </div>

      {(project.tags ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(project.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { api } = useAuth();
  const [form, setForm] = useState<CreateProjectRequest>({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const project = await api.createProject(form);
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slatewave-950 p-6 shadow-glass">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Project</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
              placeholder="My API Project"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
              rows={2}
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Base URL</label>
            <input
              value={form.baseUrl ?? ''}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-tide-400/50"
              placeholder="https://api.example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Tags (comma separated)</label>
            <input
              value={form.tags?.join(', ') ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-tide-400/50"
              placeholder="production, v2, internal"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-tide-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-tide-500/80 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { api } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProjects({ limit: 50 });
      setProjects(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
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
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-2xl bg-tide-600/80 px-5 py-2.5 font-medium text-white shadow-glow hover:bg-tide-500/80"
          >
            + New Project
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-slate-400">No projects yet.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-tide-400 hover:text-tide-200"
          >
            Create your first project →
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={(id) => void handleDelete(id)} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
