import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast, toastPromise } from '../../lib/toast';
import type { ApiEndpoint, Project } from '../../types/api';
import type { CreatePerfPlanRequest, PerfTestPlan, UpdatePerfPlanRequest } from '../../types/performance';
import { ConfirmModal } from '../ui';
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
  const [confirmDelete, setConfirmDelete] = useState<PerfTestPlan | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await api.getPerfPlans(project.id);
      setPlans(data);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      toast.error('Failed to load performance plans');
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
    await toastPromise(api.createPerfPlan(project.id, data), {
      loading: 'Creating plan...',
      success: 'Plan created',
    });
    setView('list');
    void fetchPlans();
  }

  async function handleUpdate(data: UpdatePerfPlanRequest) {
    if (!editingPlan) return;
    await toastPromise(api.updatePerfPlan(project.id, editingPlan.id, data), {
      loading: 'Saving plan...',
      success: 'Plan updated',
    });
    setEditingPlan(null);
    setView('list');
    void fetchPlans();
  }

  function handleDelete(plan: PerfTestPlan) {
    setConfirmDelete(plan);
  }

  async function confirmDeletePlan() {
    if (!confirmDelete) return;
    const plan = confirmDelete;
    setConfirmDelete(null);
    try {
      await toastPromise(api.deletePerfPlan(project.id, plan.id), {
        loading: 'Deleting plan...',
        success: 'Plan deleted',
      });
      void fetchPlans();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    }
  }

  async function handleRun(plan: PerfTestPlan) {
    try {
      const { executionId } = await toastPromise(api.startPerfExecution(project.id, plan.id), {
        loading: 'Starting execution...',
        success: 'Execution started',
      });
      navigate(`/projects/${project.id}/perf-executions/${executionId}`);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
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
      <PerfPlanList
        projectId={project.id}
        plans={plans}
        onCreateClick={() => setView('create')}
        onEditClick={(plan) => { setEditingPlan(plan); setView('edit'); }}
        onDeleteClick={handleDelete}
        onRunClick={handleRun}
      />
      {confirmDelete ? (
        <ConfirmModal
          title="Delete plan"
          message={`Delete "${confirmDelete.name}"? This will also delete all its executions.`}
          confirmLabel="Delete"
          onConfirm={() => void confirmDeletePlan()}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}
