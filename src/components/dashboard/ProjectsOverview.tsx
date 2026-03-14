import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { DashboardStats } from '../../types/dashboard';

interface ProjectsOverviewProps {
  projects: DashboardStats['recentProjects'];
}

export function ProjectsOverview({ projects }: ProjectsOverviewProps) {
  const navigate = useNavigate();

  return (
    <div className="dash-card">
      <h3 className="text-sm font-semibold">
        Projects <span className="text-slate-500">({projects.length})</span>
      </h3>

      {projects.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No projects yet. Create your first project!</p>
      ) : (
        <div className="mt-4 space-y-3">
          {projects.map((project) => {
            const scoreColor =
              project.lastTestScore == null
                ? 'text-slate-500'
                : project.lastTestScore >= 80
                  ? 'text-emerald-400'
                  : project.lastTestScore >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400';

            return (
              <div
                key={project.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/5 p-3 transition hover:border-white/10 hover:bg-white/[0.02]"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{project.endpointCount} endpoints</span>
                    <span>{project.testRunCount} runs</span>
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <p className={cn('text-lg font-bold', scoreColor)}>
                    {project.lastTestScore != null ? `${project.lastTestScore}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">score</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
