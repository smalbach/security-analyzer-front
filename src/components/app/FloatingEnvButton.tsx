import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { toast } from '../../lib/toast';
import { useSessionTokenStore } from '../../stores/sessionTokenStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import type { ProjectEnvironment } from '../../types/environments';
import { EnvironmentManager } from './EnvironmentManager';

function TokenCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const display =
    hours > 0
      ? `${hours}h ${minutes % 60}m`
      : minutes > 0
        ? `${minutes}m ${seconds % 60}s`
        : `${seconds}s`;

  const color =
    remaining <= 0
      ? 'text-red-400'
      : remaining < 60_000
        ? 'text-red-400'
        : remaining < 300_000
          ? 'text-amber-400'
          : 'text-emerald-400';

  return (
    <span className={`font-mono text-xs ${color}`}>
      {remaining <= 0 ? 'Expired' : display}
    </span>
  );
}

export function FloatingEnvButton() {
  const { user, isAuthenticated, api } = useAuth();
  const { activeProject } = useActiveProject();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const activeEnv = useEnvironmentStore((s) => (activeProject ? s.getActiveEnv(activeProject.id) : null));
  const setActiveEnvInStore = useEnvironmentStore((s) => s.setActiveEnv);
  const invalidateEnvCache = useEnvironmentStore((s) => s.invalidate);

  const sessionToken = useSessionTokenStore((s) => (activeProject ? s.getToken(activeProject.id) : null));

  const fetchEnvironments = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const envs = await api.getEnvironments(activeProject.id);
      setEnvironments(envs);
      const active = envs.find((e) => e.isActive);
      if (active) {
        setActiveEnvInStore(activeProject.id, active);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [api, activeProject, setActiveEnvInStore]);

  useEffect(() => {
    if (activeProject && open) {
      void fetchEnvironments();
    }
  }, [activeProject, open, fetchEnvironments]);

  // Fetch active env on project change or when cache is invalidated
  useEffect(() => {
    if (!activeProject) return;
    if (activeEnv) return; // Already in cache
    void (async () => {
      try {
        const env = await api.getActiveEnvironment(activeProject.id);
        if (env) setActiveEnvInStore(activeProject.id, env);
      } catch {
        // ignore
      }
    })();
  }, [activeProject, activeEnv, api, setActiveEnvInStore]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDropdown = dropdownRef.current?.contains(target);
      const insideButton = buttonRef.current?.contains(target);
      if (!insideDropdown && !insideButton) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Update dropdown position when open
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  if (!isAuthenticated || !activeProject) return null;

  const handleActivate = async (envId: string) => {
    try {
      const env = await api.activateEnvironment(activeProject.id, envId);
      setActiveEnvInStore(activeProject.id, env);
      setEnvironments((prev) =>
        prev.map((e) => ({ ...e, isActive: e.id === envId })),
      );
      toast.success(`Environment "${env.name}" activated`);
    } catch {
      toast.error('Failed to activate environment');
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-glass backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
      >
        <span className={`h-2 w-2 rounded-full ${activeEnv ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        {activeEnv?.name ?? 'No Environment'}
        {sessionToken && (
          <span className="ml-1 rounded bg-tide-500/20 px-1.5 py-0.5 text-[10px] text-tide-300">
            Token
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-96 rounded-2xl border border-white/10 bg-slatewave-950/95 shadow-glass backdrop-blur-xl"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
            {/* Environments section */}
            <div className="border-b border-white/10 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Environments
              </p>
              {loading ? (
                <p className="text-xs text-slate-500">Loading...</p>
              ) : environments.length === 0 ? (
                <p className="text-xs text-slate-500">No environments configured</p>
              ) : (
                <div className="space-y-1">
                  {environments.map((env) => (
                    <div key={env.id}>
                      <button
                        type="button"
                        onClick={() => void handleActivate(env.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                          env.isActive
                            ? 'bg-tide-500/10 text-tide-300'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            env.isActive ? 'bg-tide-400' : 'bg-slate-600'
                          }`}
                        />
                        {env.name}
                        <span className="ml-auto text-[10px] text-slate-600">
                          {env.variables.filter((v) => v.enabled).length} vars
                        </span>
                      </button>
                      {/* Inline variables for active environment */}
                      {env.isActive && env.variables.filter((v) => v.enabled).length > 0 && (
                        <div className="ml-4 mt-1 rounded-lg border border-white/5 bg-black/20 p-2">
                          <div className="space-y-0.5">
                            {env.variables
                              .filter((v) => v.enabled)
                              .map((v) => (
                                <div key={v.key} className="flex items-center gap-1.5 text-[10px]">
                                  <span className="shrink-0 font-mono text-tide-400/80">{v.key}</span>
                                  <span className="text-slate-600">=</span>
                                  <span className="truncate font-mono text-slate-400">
                                    {v.sensitive
                                      ? '••••••••'
                                      : (v.currentValue || v.defaultValue || (
                                          <span className="italic text-slate-600">empty</span>
                                        ))}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setManagerOpen(true);
                }}
                className="mt-2 w-full rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-center text-xs text-slate-500 transition-colors hover:border-white/20 hover:text-slate-400"
              >
                Manage Environments
              </button>
            </div>

            {/* User section */}
            <div className="border-b border-white/10 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                User
              </p>
              <p className="text-xs text-slate-300">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.email}</p>
            </div>

            {/* Token section */}
            <div className="p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Captured Token
              </p>
              {sessionToken ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Expires in:</span>
                    {sessionToken.expiresAt ? (
                      <TokenCountdown expiresAt={sessionToken.expiresAt} />
                    ) : (
                      <span className="text-xs text-slate-500">Unknown</span>
                    )}
                  </div>
                  {sessionToken.decodedPayload && (
                    <div className="max-h-32 overflow-auto rounded-lg bg-black/30 p-2">
                      {Object.entries(sessionToken.decodedPayload)
                        .filter(([k]) => !['iat', 'nbf'].includes(k))
                        .map(([key, value]) => (
                          <div key={key} className="flex gap-1 text-[10px]">
                            <span className="shrink-0 text-tide-400">{key}:</span>
                            <span className="break-all text-slate-400">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                  <p className="truncate font-mono text-[10px] text-slate-600">
                    {sessionToken.token.slice(0, 40)}...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    No token captured yet.
                  </p>
                  <div className="rounded-lg border border-tide-500/20 bg-tide-500/5 p-2">
                    <p className="mb-1 text-[10px] font-semibold text-tide-400">
                      How to auto-capture a token
                    </p>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      In your login endpoint, add a <span className="font-semibold text-slate-300">Post-response script</span> and use a variable named{' '}
                      <code className="rounded bg-black/30 px-1 font-mono text-tide-300">token</code>:
                    </p>
                    <pre className="mt-1.5 overflow-x-auto rounded bg-black/30 p-1.5 font-mono text-[9px] leading-relaxed text-slate-300">{`const data = pm.response.json();
pm.environment.set("token", data.access_token);`}</pre>
                    <p className="mt-1 text-[10px] text-slate-500">
                      The token will appear here after executing the endpoint.
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>,
        document.body,
      )}

      {managerOpen && (
        <EnvironmentManager
          projectId={activeProject.id}
          onClose={() => {
            setManagerOpen(false);
            if (activeProject) invalidateEnvCache(activeProject.id);
          }}
        />
      )}
    </>
  );
}
