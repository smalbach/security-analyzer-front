import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { ApiEndpoint, Project } from '../../types/api';
import type { CreatePerfPlanRequest, PerfTestPlan, UpdatePerfPlanRequest } from '../../types/performance';
import { PerfPlanEditor } from './PerfPlanEditor';
import { PerfPlanList } from './PerfPlanList';

interface PerformanceTabProps {
  project: Project;
}

type View = 'list' | 'create' | 'edit';

export function PerformanceTab({ project }: PerformanceTabProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Array<PerfTestPlan & { executionCount: number }>>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editingPlan, setEditingPlan] = useState<PerfTestPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await api.getPerfPlans(project.id);
      setPlans(data);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError('Failed to load performance plans.');
    } finally {
      setLoading(false);
    }
  }, [api, project.id]);

  const fetchEndpoints = useCallback(async () => {
    try {
      const data = await api.getEndpoints(project.id);
      setEndpoints(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch {
      // Non-critical — endpoints list used for step picker
    }
  }, [api, project.id]);

  useEffect(() => {
    void fetchPlans();
    void fetchEndpoints();
  }, [fetchPlans, fetchEndpoints]);

  async function handleCreate(data: CreatePerfPlanRequest) {
    await api.createPerfPlan(project.id, data);
    setView('list');
    void fetchPlans();
  }

  async function handleUpdate(data: UpdatePerfPlanRequest) {
    if (!editingPlan) return;
    await api.updatePerfPlan(project.id, editingPlan.id, data);
    setEditingPlan(null);
    setView('list');
    void fetchPlans();
  }

  async function handleDelete(plan: PerfTestPlan) {
    if (!window.confirm(`Delete plan "${plan.name}"? This will also delete all its executions.`)) return;
    try {
      await api.deletePerfPlan(project.id, plan.id);
      void fetchPlans();
    } catch (err) {
      setError('Failed to delete plan.');
    }
  }

  async function handleRun(plan: PerfTestPlan) {
    try {
      const { executionId } = await api.startPerfExecution(project.id, plan.id);
      navigate(`/projects/${project.id}/perf-executions/${executionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution.');
    }
  }

  const endpointOptions = endpoints.map((ep) => ({
    id: ep.id,
    method: ep.method,
    path: ep.path,
  }));

  if (loading) {
    return <div className="py-10 text-center text-slate-500">Loading…</div>;
  }

  if (view === 'create') {
    return (
      <PerfPlanEditor
        title="New Performance Test Plan"
        availableEndpoints={endpointOptions}
        onSave={handleCreate}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && editingPlan) {
    return (
      <PerfPlanEditor
        title={`Edit: ${editingPlan.name}`}
        initialValues={{
          name: editingPlan.name,
          description: editingPlan.description ?? undefined,
          scenarios: editingPlan.scenarios,
          loadProfile: editingPlan.loadProfile,
          thresholds: editingPlan.thresholds,
        }}
        availableEndpoints={endpointOptions}
        onSave={handleUpdate}
        onCancel={() => { setEditingPlan(null); setView('list'); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <PerfPlanList
        projectId={project.id}
        plans={plans}
        onCreateClick={() => setView('create')}
        onEditClick={(plan) => { setEditingPlan(plan); setView('edit'); }}
        onDeleteClick={handleDelete}
        onRunClick={handleRun}
      />
    </div>
  );
}
