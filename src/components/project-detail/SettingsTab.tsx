import { useState, type FormEvent } from 'react';
import { ProjectAuthConfigFields, buildAuthConfigPayload, getAuthConfigLoginBodyText } from '../project-auth';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { AuthConfig, Project } from '../../types/api';
import { Button, FormField, HelpTooltip, Input, Textarea } from '../ui';

interface SettingsTabProps {
  project: Project;
  onUpdated: (project: Project) => void;
}

export function SettingsTab({ project, onUpdated }: SettingsTabProps) {
  const { api } = useAuth();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    baseUrl: project.baseUrl ?? '',
    tags: (project.tags ?? []).join(', '),
  });
  const [authType, setAuthType] = useState<AuthConfig['type']>(project.authConfig?.type ?? 'none');
  const [authConfig, setAuthConfig] = useState<AuthConfig>(project.authConfig ?? { type: 'none' });
  const [loginBodyText, setLoginBodyText] = useState(() => getAuthConfigLoginBodyText(project.authConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const authPayload = buildAuthConfigPayload(authType, authConfig, loginBodyText);
      if (authPayload.error) {
        setError(authPayload.error);
        return;
      }

      const updatedProject = await api.updateProject(project.id, {
        name: form.name,
        description: form.description || undefined,
        baseUrl: form.baseUrl || undefined,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        authConfig: authPayload.authConfig,
      });

      onUpdated(updatedProject);
      toast.success('Settings saved');
    } catch (saveError) {
      if (isUnauthorizedError(saveError)) {
        return;
      }
      setError(saveError instanceof Error ? saveError.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSave(event)} className="max-w-2xl space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <FormField label="Name *" htmlFor="project-name">
        <Input
          id="project-name"
          required
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </FormField>

      <FormField label="Description" htmlFor="project-description">
        <Textarea
          id="project-description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          rows={2}
        />
      </FormField>

      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <label htmlFor="project-base-url" className="text-sm text-slate-400">Base URL</label>
          <HelpTooltip content="The root URL of your API, e.g. https://api.myapp.com — all endpoint paths are appended to this." />
        </div>
        <Input
          id="project-base-url"
          value={form.baseUrl}
          onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
          className="font-mono"
          placeholder="https://api.example.com"
        />
      </div>

      <FormField label="Tags (comma separated)" htmlFor="project-tags">
        <Input
          id="project-tags"
          value={form.tags}
          onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
          placeholder="production, v2, internal"
        />
      </FormField>

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-300">Authentication</span>
          <HelpTooltip
            content="How the scanner logs in to test authenticated endpoints. Choose None if your API is public."
            position="right"
          />
        </div>
        <ProjectAuthConfigFields
          authType={authType}
          authConfig={authConfig}
          loginBodyText={loginBodyText}
          onAuthTypeChange={setAuthType}
          onAuthConfigChange={(patch) => setAuthConfig((current) => ({ ...current, ...patch }))}
          onLoginBodyTextChange={setLoginBodyText}
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
