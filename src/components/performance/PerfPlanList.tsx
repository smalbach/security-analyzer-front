import { useNavigate } from 'react-router-dom';
import type { PerfTestPlan } from '../../types/performance';
import { Button, EmptyState } from '../ui';

interface PerfPlanListProps {
  projectId: string;
  plans: Array<PerfTestPlan & { executionCount?: number }>;
  onCreateClick: () => void;
  onEditClick: (plan: PerfTestPlan) => void;
  onDeleteClick: (plan: PerfTestPlan) => void;
  onRunClick: (plan: PerfTestPlan) => void;
}

export function PerfPlanList({
  projectId,
  plans,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onRunClick,
}: PerfPlanListProps) {
  const navigate = useNavigate();

  if (plans.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <Button onClick={onCreateClick}>New Plan</Button>
        </div>
        <EmptyState
          title="No performance test plans yet."
          description="Create a plan to define load profiles, scenarios, and thresholds."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">{plans.length} plan{plans.length !== 1 ? 's' : ''}</h3>
        <Button onClick={onCreateClick}>New Plan</Button>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}/perf-executions?planId=${plan.id}`)}
                className="text-left"
              >
                <p className="truncate font-medium text-slate-200">{plan.name}</p>
              </button>
              {plan.description && (
                <p className="mt-0.5 truncate text-xs text-slate-500">{plan.description}</p>
              )}
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span>{plan.loadProfile.virtualUsers} VUs</span>
                <span>·</span>
                <span>{plan.loadProfile.durationSeconds}s</span>
                <span>·</span>
                <span>{plan.loadProfile.strategy}</span>
                {plan.executionCount !== undefined && (
                  <>
                    <span>·</span>
                    <span>{plan.executionCount} run{plan.executionCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => onRunClick(plan)}>
                Run
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onEditClick(plan)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDeleteClick(plan)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
