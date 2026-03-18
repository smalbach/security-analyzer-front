import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type { GitHubConnection } from '../../types/api';
import { Button, Modal, Input } from '../ui';
import { BackendTypeSelector } from './BackendTypeSelector';

interface ConnectGitHubModalProps {
  projectId: string;
  onClose: () => void;
  onConnected: (connection: GitHubConnection) => void;
}

export function ConnectGitHubModal({ projectId, onClose, onConnected }: ConnectGitHubModalProps) {
  const { api } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [backendType, setBackendType] = useState('nestjs');
  const [basePath, setBasePath] = useState('');
  const [globalPrefix, setGlobalPrefix] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!repoUrl.trim()) return;
    setConnecting(true);
    try {
      const connection = await toastPromise(
        api.connectGitHub(projectId, {
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || 'main',
          accessToken: accessToken.trim() || undefined,
          backendType,
          basePath: basePath.trim() || undefined,
          globalPrefix: globalPrefix.trim() || undefined,
        }),
        {
          loading: 'Connecting to GitHub...',
          success: 'Connected successfully!',
        },
      );
      onConnected(connection);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Modal
      title="Connect GitHub Repository"
      description="Connect a NestJS backend repository to scan and import its API endpoints."
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleConnect()} disabled={!repoUrl.trim() || connecting}>
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Backend Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Backend Type</label>
          <BackendTypeSelector value={backendType} onChange={setBackendType} />
        </div>

        {/* Repo URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Repository URL</label>
          <Input
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Public or private GitHub repository URL</p>
        </div>

        {/* Branch */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Branch</label>
          <Input
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>

        {/* Access Token */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Access Token <span className="text-slate-500">(optional)</span>
          </label>
          <Input
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Required for private repositories</p>
        </div>

        {/* Base Path */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Base Path <span className="text-slate-500">(optional)</span>
          </label>
          <Input
            placeholder="apps/api"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Subdirectory for monorepo projects</p>
        </div>

        {/* Global Prefix */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Global Prefix <span className="text-slate-500">(optional)</span>
          </label>
          <Input
            placeholder="/api/v1"
            value={globalPrefix}
            onChange={(e) => setGlobalPrefix(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Auto-detected from main.ts if not provided</p>
        </div>
      </div>
    </Modal>
  );
}
