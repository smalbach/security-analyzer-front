import type { Project } from '../../types/api';
import { LinkButton } from '../ui';

interface ProjectDetailHeaderProps {
  project: Project;
}

export function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  return (
    <div className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
      <div className="flex flex-wrap items-start gap-4">
        <LinkButton
          to="/projects"
          variant="link"
          size="sm"
          className="mt-1 text-slate-500 hover:text-slate-300"
        >
          {'<'} Back
        </LinkButton>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
          {project.description ? (
            <p className="mt-1 text-sm text-slate-400">{project.description}</p>
          ) : null}
          {project.baseUrl ? (
            <p className="mt-1 font-mono text-xs text-tide-400">{project.baseUrl}</p>
          ) : null}
          {(project.tags ?? []).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
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
        </div>
      </div>
    </div>
  );
}
