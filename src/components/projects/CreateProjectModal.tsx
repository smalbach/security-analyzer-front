import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import type { CreateProjectRequest, Project } from '../../types/api';
import { Button, FormField, Input, Modal, Textarea } from '../ui';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const { api } = useAuth();
  const [form, setForm] = useState<CreateProjectRequest>({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const project = await api.createProject(form);
      onCreated(project);
    } catch (submitError) {
      if (isUnauthorizedError(submitError)) {
        return;
      }
      setError(submitError instanceof Error ? submitError.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="New Project"
      description="Create a project to group endpoints, credentials, and security test runs."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      }
    >
      <form id="create-project-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <FormField label="Name *" htmlFor="create-project-name">
          <Input
            id="create-project-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="My API Project"
          />
        </FormField>

        <FormField label="Description" htmlFor="create-project-description">
          <Textarea
            id="create-project-description"
            value={form.description ?? ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={2}
            placeholder="Optional description"
          />
        </FormField>

        <FormField label="Base URL" htmlFor="create-project-base-url">
          <Input
            id="create-project-base-url"
            value={form.baseUrl ?? ''}
            onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
            className="font-mono"
            placeholder="https://api.example.com"
          />
        </FormField>

        <FormField label="Tags (comma separated)" htmlFor="create-project-tags">
          <Input
            id="create-project-tags"
            value={form.tags?.join(', ') ?? ''}
            onChange={(event) =>
              setForm({
                ...form,
                tags: event.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
            placeholder="production, v2, internal"
          />
        </FormField>
      </form>
    </Modal>
  );
}
