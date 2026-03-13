import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { DEFAULT_TEST_RUN_RULES } from '../../lib/testRuns';
import type {
  Project,
  ProjectRole,
  RuleSelection,
  StartTestRunRequest,
  TestCredential,
  TestRun,
} from '../../types/api';
import { SecurityRuleSelector } from '../SecurityRuleSelector';
import { Button, FormField, Input, Modal } from '../ui';
import { EndpointSelectorPanel } from './EndpointSelectorPanel';
import { TestRunExecutionOptions } from './TestRunExecutionOptions';
import { DEFAULT_TEST_RUN_EXECUTION_OPTIONS, buildStartTestRunPayload } from './testRunForm';

interface StartTestRunModalProps {
  project: Project;
  onClose: () => void;
  onStarted: (run: TestRun) => void;
}

const EMPTY_CREDENTIAL: TestCredential = {
  username: '',
  password: '',
  role: '',
};

type EndpointScope = 'all' | 'selected';

export function StartTestRunModal({
  project,
  onClose,
  onStarted,
}: StartTestRunModalProps) {
  const { api } = useAuth();
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [label, setLabel] = useState('');
  const [credentials, setCredentials] = useState<TestCredential[]>([{ ...EMPTY_CREDENTIAL }]);

  useEffect(() => {
    api.getRoles(project.id)
      .then(setRoles)
      .catch(() => { /* roles optional — fall back to text input */ });
  }, [api, project.id]);
  const [rules, setRules] = useState<RuleSelection>(() => ({ ...DEFAULT_TEST_RUN_RULES }));
  const [options, setOptions] = useState(DEFAULT_TEST_RUN_EXECUTION_OPTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ─── Endpoint scope ────────────────────────────────────────────────────────
  const [scope, setScope] = useState<EndpointScope>('all');
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);

  const updateCredential = (index: number, patch: Partial<TestCredential>) => {
    setCredentials((previous) =>
      previous.map((credential, credentialIndex) =>
        credentialIndex === index ? { ...credential, ...patch } : credential,
      ),
    );
  };

  const addCredential = () => {
    setCredentials((previous) => [...previous, { ...EMPTY_CREDENTIAL }]);
  };

  const removeCredential = (index: number) => {
    setCredentials((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, credentialIndex) => credentialIndex !== index),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Guard: if "selected" scope but nothing chosen, block submission
    if (scope === 'selected' && selectedEndpointIds.length === 0) {
      setError('Selecciona al menos un endpoint antes de iniciar el test run.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const endpointIds =
        scope === 'selected' && selectedEndpointIds.length > 0
          ? selectedEndpointIds
          : undefined;

      const buildResult = buildStartTestRunPayload({
        label,
        credentials,
        rules,
        options,
        endpointIds,
      });
      if (buildResult.error || !buildResult.payload) {
        setError(buildResult.error ?? 'Failed to build the test run payload.');
        return;
      }

      const payload: StartTestRunRequest = buildResult.payload;
      const run = await api.startTestRun(project.id, payload);
      if (!run?.id) {
        setError('The test run started but no run id was returned yet. Please try again in a few seconds.');
        return;
      }
      onStarted(run);
    } catch (submitError) {
      if (isUnauthorizedError(submitError)) {
        return;
      }
      setError(submitError instanceof Error ? submitError.message : 'Failed to start test run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New Test Run"
      description="Configure the run label, endpoint scope, test credentials, and rule coverage before launching a scan."
      size="2xl"
      onClose={onClose}
      bodyClassName="space-y-6"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="start-test-run-form" disabled={submitting}>
            {submitting ? 'Starting...' : 'Start Test Run'}
          </Button>
        </div>
      }
    >
      <form id="start-test-run-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <FormField label="Label (optional)" htmlFor="test-run-label">
          <Input
            id="test-run-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Sprint 12 security test"
          />
        </FormField>

        {/* ── Endpoint scope ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Endpoints a testear</p>
            <p className="text-xs text-slate-500">
              Elige si quieres probar todos los endpoints del proyecto o sólo algunos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* All endpoints option */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 has-[:checked]:border-tide-400/40 has-[:checked]:bg-tide-500/10">
              <input
                type="radio"
                name="endpoint-scope"
                value="all"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                className="accent-tide-400"
              />
              <div>
                <p className="text-sm font-medium text-slate-200">Todos los endpoints</p>
                <p className="text-xs text-slate-500">Ejecuta los tests sobre el proyecto completo.</p>
              </div>
            </label>

            {/* Selected endpoints option — always enabled */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 has-[:checked]:border-tide-400/40 has-[:checked]:bg-tide-500/10">
              <input
                type="radio"
                name="endpoint-scope"
                value="selected"
                checked={scope === 'selected'}
                onChange={() => setScope('selected')}
                className="accent-tide-400"
              />
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Seleccionados
                  {scope === 'selected' && selectedEndpointIds.length > 0 ? (
                    <span className="ml-1.5 text-xs text-tide-300">
                      ({selectedEndpointIds.length})
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">Elige qué endpoints incluir en este run.</p>
              </div>
            </label>
          </div>

          {/* Inline endpoint selector — shown when 'selected' is active */}
          {scope === 'selected' ? (
            <EndpointSelectorPanel
              projectId={project.id}
              onChange={setSelectedEndpointIds}
            />
          ) : null}
        </div>

        {/* ── Credentials ────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-slate-400">Test Credentials</p>
              <p className="text-xs text-slate-500">
                Add one or more accounts to exercise authorization checks and cross-user flows.
              </p>
            </div>
            <Button variant="link" size="sm" onClick={addCredential}>
              Add credential
            </Button>
          </div>

          <div className="space-y-3">
            {credentials.map((credential, index) => (
              <div key={`credential-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Credential {index + 1}
                  </p>
                  {credentials.length > 1 ? (
                    <Button variant="danger" size="xs" onClick={() => removeCredential(index)}>
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <FormField label="Username / email">
                    <Input
                      value={credential.username}
                      onChange={(event) =>
                        updateCredential(index, { username: event.target.value })
                      }
                      placeholder="user@example.com"
                    />
                  </FormField>
                  <FormField label="Password">
                    <Input
                      type="password"
                      value={credential.password}
                      onChange={(event) =>
                        updateCredential(index, { password: event.target.value })
                      }
                      placeholder="Password"
                    />
                  </FormField>
                  <FormField label="Role">
                    {roles.length > 0 ? (
                      <select
                        className="field w-full"
                        value={credential.roleId ?? ''}
                        onChange={(event) => {
                          const role = roles.find((r) => r.id === event.target.value);
                          updateCredential(index, {
                            roleId: event.target.value || undefined,
                            role: role?.name,
                          });
                        }}
                      >
                        <option value="">— No role —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={credential.role ?? ''}
                        onChange={(event) => updateCredential(index, { role: event.target.value })}
                        placeholder="admin"
                      />
                    )}
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </div>

        <TestRunExecutionOptions
          options={options}
          onChange={(patch) => setOptions((current) => ({ ...current, ...patch }))}
        />

        <SecurityRuleSelector value={rules} onChange={setRules} defaultCollapsed />
      </form>
    </Modal>
  );
}
