import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types/api';
import { Button } from '../ui';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="group relative cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-xl transition hover:border-tide-400/30 hover:bg-white/8"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-100">{project.name}</h3>
          {project.description ? (
            <p className="mt-1 truncate text-sm text-slate-400">{project.description}</p>
          ) : null}
          {project.baseUrl ? (
            <p className="mt-1 truncate font-mono text-xs text-tide-400">{project.baseUrl}</p>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(project.id);
          }}
          className="hidden text-slate-500 hover:bg-red-500/20 hover:text-red-400 group-hover:inline-flex"
          title="Delete project"
        >
          x
        </Button>
      </div>

      {(project.tags ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 text-xs text-slate-500">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
