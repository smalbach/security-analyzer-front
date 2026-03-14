import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types/api';
import { Button } from '../ui';

interface ProjectCardProps {
  project: Project;
  onArchive: (projectId: string) => void;
  onUnarchive: (projectId: string) => void;
}

function getHealthClasses(score?: number): string {
  if (score === undefined) return 'border-white/10 bg-white/5';
  if (score >= 80) return 'border-emerald-500/20 bg-emerald-500/[0.08]';
  if (score >= 60) return 'border-yellow-500/20 bg-yellow-500/[0.08]';
  if (score >= 40) return 'border-orange-500/20 bg-orange-500/[0.08]';
  return 'border-red-500/20 bg-red-500/[0.08]';
}

export function ProjectCard({ project, onArchive, onUnarchive }: ProjectCardProps) {
  const navigate = useNavigate();
  const healthClasses = getHealthClasses(project.lastRunSummary?.securityScore);

  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border p-5 shadow-glass backdrop-blur-xl transition hover:border-tide-400/30 hover:bg-white/8 ${healthClasses}`}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-100">{project.name}</h3>
            {project.isArchived ? (
              <span className="shrink-0 rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-xs text-slate-400">
                Archived
              </span>
            ) : null}
          </div>
          {project.description ? (
            <p className="mt-1 truncate text-sm text-slate-400">{project.description}</p>
          ) : null}
          {project.baseUrl ? (
            <p className="mt-1 truncate font-mono text-xs text-tide-400">{project.baseUrl}</p>
          ) : null}
        </div>

        {project.isArchived ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              onUnarchive(project.id);
            }}
            className="hidden text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400 group-hover:inline-flex"
            title="Restore project"
          >
            ↩
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              onArchive(project.id);
            }}
            className="hidden text-slate-500 hover:bg-slate-500/20 hover:text-slate-300 group-hover:inline-flex"
            title="Archive project"
          >
            ⊡
          </Button>
        )}
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
