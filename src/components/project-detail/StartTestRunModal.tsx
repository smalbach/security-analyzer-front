import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { DEFAULT_TEST_RUN_RULES } from '../../lib/testRuns';
import type {
  Project,
  RuleSelection,
  StartTestRunRequest,
  TestCredential,
  TestRun,
} from '../../types/api';
import { SecurityRuleSelector } from '../SecurityRuleSelector';
import { Button, FormField, Input, Modal } from '../ui';

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

export function StartTestRunModal({
  project,
  onClose,
  onStarted,
}: StartTestRunModalProps) {
  const { api } = useAuth();
  const [label, setLabel] = useState('');
  const [credentials, setCredentials] = useState<TestCredential[]>([{ ...EMPTY_CREDENTIAL }]);
  const [rules, setRules] = useState<RuleSelection>(() => ({ ...DEFAULT_TEST_RUN_RULES }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    setSubmitting(true);
    setError('');

    try {
      const payload: StartTestRunRequest = {
        label: label.trim() || undefined,
        credentials: credentials.filter((credential) => credential.username.trim()),
        rules,
      };
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
      description="Configure the run label, test credentials, and rule coverage before launching a scan."
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
                    <Input
                      value={credential.role ?? ''}
                      onChange={(event) => updateCredential(index, { role: event.target.value })}
                      placeholder="admin"
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SecurityRuleSelector value={rules} onChange={setRules} defaultCollapsed />
      </form>
    </Modal>
  );
}
