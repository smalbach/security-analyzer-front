import { useState } from 'react';
import type {
  CreatePerfPlanRequest,
  LoadProfile,
  LoadStrategy,
  PerfScenario,
  PerfThreshold,
  ThresholdMetric,
  ThresholdOperator,
} from '../../types/performance';
import { Button, HelpTooltip, Input, Select } from '../ui';

const uuidv4 = () => crypto.randomUUID();

interface PerfPlanEditorProps {
  initialValues?: Partial<CreatePerfPlanRequest>;
  onSave: (data: CreatePerfPlanRequest) => Promise<void>;
  onCancel: () => void;
  title: string;
  availableEndpoints: Array<{ id: string; method: string; path: string }>;
}

const STRATEGY_LABELS: Record<LoadStrategy, string> = {
  constant: 'Constant (fixed VUs)',
  ramp: 'Ramp-up (gradual increase)',
  spike: 'Spike (all at once)',
};

const THRESHOLD_METRICS: ThresholdMetric[] = [
  'p50', 'p75', 'p90', 'p95', 'p99', 'errorRate', 'rps', 'avgResponseTime',
];

const OPERATORS: ThresholdOperator[] = ['lt', 'lte', 'gt', 'gte'];

const OPERATOR_LABELS: Record<ThresholdOperator, string> = {
  lt: '< (less than)',
  lte: '≤ (less or equal)',
  gt: '> (greater than)',
  gte: '≥ (greater or equal)',
};

const DEFAULT_LOAD_PROFILE: LoadProfile = {
  strategy: 'constant',
  virtualUsers: 10,
  durationSeconds: 60,
};

export function PerfPlanEditor({
  initialValues,
  onSave,
  onCancel,
  title,
  availableEndpoints,
}: PerfPlanEditorProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [loadProfile, setLoadProfile] = useState<LoadProfile>(
    initialValues?.loadProfile ?? DEFAULT_LOAD_PROFILE,
  );
  const [scenarios, setScenarios] = useState<PerfScenario[]>(
    initialValues?.scenarios ?? [],
  );
  const [thresholds, setThresholds] = useState<PerfThreshold[]>(
    initialValues?.thresholds ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Scenario management ──────────────────────────────────────────────────

  function addScenario() {
    setScenarios((prev) => [
      ...prev,
      { id: uuidv4(), name: `Scenario ${prev.length + 1}`, steps: [], weight: 1 },
    ]);
  }

  function removeScenario(id: string) {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  function addStep(scenarioId: string) {
    if (availableEndpoints.length === 0) return;
    const ep = availableEndpoints[0];
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              steps: [
                ...s.steps,
                {
                  id: uuidv4(),
                  endpointId: ep.id,
                  method: ep.method,
                  path: ep.path,
                  thinkTimeMs: 0,
                },
              ],
            }
          : s,
      ),
    );
  }

  function removeStep(scenarioId: string, stepId: string) {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId ? { ...s, steps: s.steps.filter((st) => st.id !== stepId) } : s,
      ),
    );
  }

  function updateStepEndpoint(scenarioId: string, stepId: string, endpointId: string) {
    const ep = availableEndpoints.find((e) => e.id === endpointId);
    if (!ep) return;
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              steps: s.steps.map((st) =>
                st.id === stepId
                  ? { ...st, endpointId: ep.id, method: ep.method, path: ep.path }
                  : st,
              ),
            }
          : s,
      ),
    );
  }

  // ── Threshold management ─────────────────────────────────────────────────

  function addThreshold() {
    setThresholds((prev) => [
      ...prev,
      { metric: 'p95', operator: 'lt', value: 500, severity: 'high' },
    ]);
  }

  function removeThreshold(index: number) {
    setThresholds((prev) => prev.filter((_, i) => i !== index));
  }

  function updateThreshold<K extends keyof PerfThreshold>(
    index: number, key: K, value: PerfThreshold[K],
  ) {
    setThresholds((prev) => prev.map((t, i) => (i === index ? { ...t, [key]: value } : t)));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) { setError('Plan name is required.'); return; }
    if (scenarios.length === 0) { setError('Add at least one scenario.'); return; }
    if (scenarios.some((s) => s.steps.length === 0)) { setError('Each scenario must have at least one step.'); return; }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        scenarios,
        loadProfile,
        thresholds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-200">{title}</h2>

      {/* Basic info */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Plan name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Checkout Flow Load Test" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Load profile */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Load Profile</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Strategy</label>
              <HelpTooltip content="Constant = fixed users throughout. Ramp = gradually increase. Spike = all at once." />
            </div>
            <Select
              value={loadProfile.strategy}
              onChange={(e) => setLoadProfile((p) => ({ ...p, strategy: e.target.value as LoadStrategy }))}
            >
              {(Object.keys(STRATEGY_LABELS) as LoadStrategy[]).map((s) => (
                <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Virtual Users</label>
              <HelpTooltip content="The number of simulated users hitting your API simultaneously." />
            </div>
            <Input
              type="number"
              min={1}
              max={5000}
              value={loadProfile.virtualUsers}
              onChange={(e) => setLoadProfile((p) => ({ ...p, virtualUsers: parseInt(e.target.value, 10) || 1 }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Duration (seconds)</label>
            <Input
              type="number"
              min={1}
              max={3600}
              value={loadProfile.durationSeconds}
              onChange={(e) => setLoadProfile((p) => ({ ...p, durationSeconds: parseInt(e.target.value, 10) || 30 }))}
            />
          </div>
          {loadProfile.strategy === 'ramp' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Ramp-up (seconds)</label>
              <Input
                type="number"
                min={0}
                value={loadProfile.rampUpSeconds ?? 0}
                onChange={(e) => setLoadProfile((p) => ({ ...p, rampUpSeconds: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Scenarios</h3>
          <Button size="sm" variant="secondary" onClick={addScenario}>Add Scenario</Button>
        </div>

        {scenarios.length === 0 && (
          <p className="text-xs text-slate-500">No scenarios yet. Add at least one.</p>
        )}

        {scenarios.map((scenario) => (
          <div key={scenario.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Input
                value={scenario.name}
                onChange={(e) => setScenarios((prev) =>
                  prev.map((s) => s.id === scenario.id ? { ...s, name: e.target.value } : s),
                )}
                placeholder="Scenario name"
                className="flex-1"
              />
              <Button size="sm" variant="danger" onClick={() => removeScenario(scenario.id)} className="ml-2">
                Remove
              </Button>
            </div>

            <div className="space-y-2">
              {scenario.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <Select
                    value={step.endpointId}
                    onChange={(e) => updateStepEndpoint(scenario.id, step.id, e.target.value)}
                    className="flex-1 text-xs"
                  >
                    {availableEndpoints.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.method} {ep.path}
                      </option>
                    ))}
                  </Select>
                  <Button size="xs" variant="danger" onClick={() => removeStep(scenario.id, step.id)}>
                    ×
                  </Button>
                </div>
              ))}
              <Button size="xs" variant="secondary" onClick={() => addStep(scenario.id)} disabled={availableEndpoints.length === 0}>
                + Add Step
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Thresholds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-slate-300">Thresholds (optional)</h3>
            <HelpTooltip content="Automatic pass/fail criteria. E.g., fail if 95th percentile response time exceeds 500ms." />
          </div>
          <Button size="sm" variant="secondary" onClick={addThreshold}>Add Threshold</Button>
        </div>

        {thresholds.map((t, index) => (
          <div key={index} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Select
              value={t.metric}
              onChange={(e) => updateThreshold(index, 'metric', e.target.value as ThresholdMetric)}
              className="text-xs"
            >
              {THRESHOLD_METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select
              value={t.operator}
              onChange={(e) => updateThreshold(index, 'operator', e.target.value as ThresholdOperator)}
              className="text-xs"
            >
              {OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
            </Select>
            <Input
              type="number"
              value={t.value}
              onChange={(e) => updateThreshold(index, 'value', parseFloat(e.target.value) || 0)}
              className="w-24"
            />
            <Button size="xs" variant="danger" onClick={() => removeThreshold(index)}>×</Button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
