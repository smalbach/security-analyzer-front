import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { AuthConfig, Project } from '../../types/api';
import { Button, FormField, Input, Select, Textarea } from '../ui';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const updatedProject = await api.updateProject(project.id, {
        name: form.name,
        description: form.description || undefined,
        baseUrl: form.baseUrl || undefined,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        authConfig: authType === 'none' ? undefined : { ...authConfig, type: authType },
      });

      onUpdated(updatedProject);
      setSaved(true);
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
      {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}

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

      <FormField label="Base URL" htmlFor="project-base-url">
        <Input
          id="project-base-url"
          value={form.baseUrl}
          onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
          className="font-mono"
          placeholder="https://api.example.com"
        />
      </FormField>

      <FormField label="Tags (comma separated)" htmlFor="project-tags">
        <Input
          id="project-tags"
          value={form.tags}
          onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
          placeholder="production, v2, internal"
        />
      </FormField>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/3 p-4">
        <p className="text-sm font-medium text-slate-300">Authentication</p>

        <FormField label="Type" htmlFor="project-auth-type" labelClassName="text-xs text-slate-500">
          <Select
            id="project-auth-type"
            value={authType}
            onChange={(event) => setAuthType(event.target.value as AuthConfig['type'])}
          >
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api_key">API Key</option>
          </Select>
        </FormField>

        {authType === 'bearer' ? (
          <FormField label="Token" htmlFor="project-auth-token" labelClassName="text-xs text-slate-500">
            <Input
              id="project-auth-token"
              value={authConfig.token ?? ''}
              onChange={(event) => setAuthConfig({ ...authConfig, token: event.target.value })}
              className="font-mono"
              placeholder="eyJ..."
            />
          </FormField>
        ) : null}

        {authType === 'basic' ? (
          <div className="grid gap-2 md:grid-cols-2">
            <FormField label="Username" htmlFor="project-basic-username" labelClassName="text-xs text-slate-500">
              <Input
                id="project-basic-username"
                value={authConfig.username ?? ''}
                onChange={(event) => setAuthConfig({ ...authConfig, username: event.target.value })}
              />
            </FormField>
            <FormField label="Password" htmlFor="project-basic-password" labelClassName="text-xs text-slate-500">
              <Input
                id="project-basic-password"
                type="password"
                value={authConfig.password ?? ''}
                onChange={(event) => setAuthConfig({ ...authConfig, password: event.target.value })}
              />
            </FormField>
          </div>
        ) : null}

        {authType === 'api_key' ? (
          <div className="grid gap-2 md:grid-cols-2">
            <FormField label="Header Name" htmlFor="project-api-key-header" labelClassName="text-xs text-slate-500">
              <Input
                id="project-api-key-header"
                value={authConfig.header_name ?? 'X-API-Key'}
                onChange={(event) => setAuthConfig({ ...authConfig, header_name: event.target.value })}
                className="font-mono"
              />
            </FormField>
            <FormField label="API Key" htmlFor="project-api-key-token" labelClassName="text-xs text-slate-500">
              <Input
                id="project-api-key-token"
                value={authConfig.token ?? ''}
                onChange={(event) => setAuthConfig({ ...authConfig, token: event.target.value })}
                className="font-mono"
              />
            </FormField>
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
