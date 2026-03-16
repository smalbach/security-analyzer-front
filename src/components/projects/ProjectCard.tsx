import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types/api';
import { Button } from '../ui';
import { cn } from '../../lib/cn';

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

function getHealthDotColor(health?: string): string {
  switch (health) {
    case 'passed':
    case 'good':
      return 'bg-emerald-400';
    case 'warning':
    case 'degraded':
      return 'bg-yellow-400';
    case 'failed':
    case 'critical':
      return 'bg-rose-400';
    default:
      return 'bg-slate-600';
  }
}

function getHealthLabel(health?: string): string {
  switch (health) {
    case 'passed':
      return 'Pass';
    case 'good':
      return 'Good';
    case 'warning':
      return 'Warn';
    case 'degraded':
      return 'Slow';
    case 'failed':
      return 'Fail';
    case 'critical':
      return 'Crit';
    default:
      return '—';
  }
}

export function ProjectCard({ project, onArchive, onUnarchive }: ProjectCardProps) {
  const navigate = useNavigate();
  const healthClasses = getHealthClasses(project.lastRunSummary?.securityScore);

  const summary = project.lastRunSummary;
  const hasAnyHealth =
    summary?.securityScore !== undefined ||
    (summary?.flowTestHealth && summary.flowTestHealth !== 'none') ||
    (summary?.perfTestHealth && summary.perfTestHealth !== 'none');

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

      {/* Test health indicators */}
      {hasAnyHealth && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Security */}
          {summary?.securityScore !== undefined && (
            <div className="flex items-center gap-1.5" title={`Security Score: ${summary.securityScore}%`}>
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  summary.securityScore >= 80
                    ? 'bg-emerald-400'
                    : summary.securityScore >= 60
                      ? 'bg-yellow-400'
                      : summary.securityScore >= 40
                        ? 'bg-orange-400'
                        : 'bg-rose-400',
                )}
              />
              <span className="text-[10px] text-slate-500">
                Security {summary.securityScore}%
              </span>
            </div>
          )}

          {/* Flow Tests */}
          {summary?.flowTestHealth && summary.flowTestHealth !== 'none' && (
            <div
              className="flex items-center gap-1.5"
              title={`Flow Tests: ${getHealthLabel(summary.flowTestHealth)}${summary.flowTestPassRate ? ` (${summary.flowTestPassRate}% pass rate)` : ''}`}
            >
              <span className={cn('h-2 w-2 rounded-full', getHealthDotColor(summary.flowTestHealth))} />
              <span className="text-[10px] text-slate-500">
                Flows {summary.flowTestPassRate ? `${summary.flowTestPassRate}%` : getHealthLabel(summary.flowTestHealth)}
              </span>
            </div>
          )}

          {/* Performance */}
          {summary?.perfTestHealth && summary.perfTestHealth !== 'none' && (
            <div
              className="flex items-center gap-1.5"
              title={`Performance: ${getHealthLabel(summary.perfTestHealth)}`}
            >
              <span className={cn('h-2 w-2 rounded-full', getHealthDotColor(summary.perfTestHealth))} />
              <span className="text-[10px] text-slate-500">
                Perf {getHealthLabel(summary.perfTestHealth)}
              </span>
            </div>
          )}
        </div>
      )}

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
