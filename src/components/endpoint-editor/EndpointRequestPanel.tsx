import { SecurityRuleSelector } from '../SecurityRuleSelector';
import { Input, TabBar, Textarea } from '../ui';
import type { CreateEndpointRequest, DataScope, EndpointRoleAccess, RuleSelection } from '../../types/api';
import { REQUEST_TABS } from './constants';
import { KeyValueTable } from './KeyValueTable';
import type { EndpointEditorTab, KVPair } from './types';

interface EndpointRequestPanelProps {
  activeTab: EndpointEditorTab;
  detectedPathParams: string[];
  pathParams: Record<string, string>;
  queryRows: KVPair[];
  headerRows: KVPair[];
  bodyText: string;
  authToken: string;
  selectedRules: RuleSelection;
  // Access control props
  endpoint: Partial<CreateEndpointRequest>;
  roleAccess: EndpointRoleAccess[];
  roleAccessLoading: boolean;
  isNew: boolean;
  onTabChange: (tab: EndpointEditorTab) => void;
  onPathParamsChange: (params: Record<string, string>) => void;
  onQueryRowsChange: (rows: KVPair[]) => void;
  onHeaderRowsChange: (rows: KVPair[]) => void;
  onBodyTextChange: (bodyText: string) => void;
  onAuthTokenChange: (authToken: string) => void;
  onRulesChange: (rules: RuleSelection) => void;
  onEndpointChange: (patch: Partial<CreateEndpointRequest>) => void;
  onRoleAccessChange: (roleId: string, field: 'hasAccess' | 'dataScope', value: boolean | DataScope) => void;
}

const DATA_SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: 'all', label: 'All data' },
  { value: 'own', label: 'Own data only' },
  { value: 'none', label: 'No data' },
];

export function EndpointRequestPanel({
  activeTab,
  detectedPathParams,
  pathParams,
  queryRows,
  headerRows,
  bodyText,
  authToken,
  selectedRules,
  endpoint,
  roleAccess,
  roleAccessLoading,
  isNew,
  onTabChange,
  onPathParamsChange,
  onQueryRowsChange,
  onHeaderRowsChange,
  onBodyTextChange,
  onAuthTokenChange,
  onRulesChange,
  onEndpointChange,
  onRoleAccessChange,
}: EndpointRequestPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl">
      <TabBar
        tabs={REQUEST_TABS}
        activeTab={activeTab}
        onChange={onTabChange}
        className="border-b border-white/10 px-4 pt-3"
      />

      <div className="p-4">
        {activeTab === 'params' ? (
          <div className="space-y-4">
            {detectedPathParams.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Path Params</p>
                <div className="space-y-1.5">
                  {detectedPathParams.map((param) => (
                    <div key={param} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 font-mono text-xs text-tide-400">{`{${param}}`}</span>
                      <Input
                        value={pathParams[param] ?? ''}
                        onChange={(event) =>
                          onPathParamsChange({ ...pathParams, [param]: event.target.value })
                        }
                        placeholder="value"
                        className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Query Params</p>
              <KeyValueTable rows={queryRows} onChange={onQueryRowsChange} />
            </div>
          </div>
        ) : null}

        {activeTab === 'headers' ? <KeyValueTable rows={headerRows} onChange={onHeaderRowsChange} /> : null}

        {activeTab === 'body' ? (
          <div>
            <p className="mb-2 text-xs text-slate-500">Content-Type: application/json</p>
            <Textarea
              value={bodyText}
              onChange={(event) => onBodyTextChange(event.target.value)}
              rows={12}
              placeholder='{"key": "value"}'
              className="bg-black/30 p-3 font-mono text-sm"
            />
          </div>
        ) : null}

        {activeTab === 'auth' ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bearer Token</p>
            <Input
              value={authToken}
              onChange={(event) => onAuthTokenChange(event.target.value)}
              placeholder="eyJ..."
              className="font-mono"
            />
            <p className="mt-2 text-xs text-slate-500">Overrides project auth for this request only.</p>
          </div>
        ) : null}

        {activeTab === 'access' ? (
          <div className="space-y-4">
            {/* Public / Authenticated toggle */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Visibility
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEndpointChange({ requiresAuth: false })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    !endpoint.requiresAuth
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'
                  }`}
                >
                  Public
                  <span className="mt-0.5 block text-xs font-normal opacity-70">No auth required</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEndpointChange({ requiresAuth: true })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    endpoint.requiresAuth
                      ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
                      : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'
                  }`}
                >
                  Authenticated
                  <span className="mt-0.5 block text-xs font-normal opacity-70">Requires valid token</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {endpoint.requiresAuth
                  ? 'Security tests will flag this endpoint if it responds 2xx without authentication.'
                  : 'This endpoint is public. Security tests will not flag unauthenticated 2xx responses.'}
              </p>
            </div>

            {/* Role permissions */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role Permissions
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Configure which roles can access this endpoint. During security tests, any role with
                <span className="text-red-400"> hasAccess=false</span> that receives a 2xx response
                is reported as a <span className="text-red-400">CRITICAL BFLA violation</span>.
              </p>

              {isNew ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  Save the endpoint first to configure role permissions.
                </p>
              ) : roleAccessLoading ? (
                <p className="py-4 text-center text-xs text-slate-500">Loading roles...</p>
              ) : roleAccess.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  No roles configured for this project. Add roles in the{' '}
                  <span className="text-tide-400">Roles</span> tab.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Role</th>
                        <th className="px-3 py-2 text-center text-xs text-slate-500">Has Access</th>
                        <th className="px-3 py-2 text-left text-xs text-slate-500">Data Scope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleAccess.map((ra) => (
                        <tr key={ra.roleId} className="border-b border-white/5 last:border-0">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {ra.color ? (
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: ra.color }}
                                />
                              ) : null}
                              <span className="text-sm text-slate-300">{ra.roleName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => onRoleAccessChange(ra.roleId, 'hasAccess', !ra.hasAccess)}
                              className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                ra.hasAccess ? 'bg-emerald-500' : 'bg-red-500/70'
                              }`}
                              title={ra.hasAccess ? 'Click to revoke access' : 'Click to grant access'}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                  ra.hasAccess ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={ra.dataScope}
                              onChange={(e) =>
                                onRoleAccessChange(ra.roleId, 'dataScope', e.target.value as DataScope)
                              }
                              disabled={!ra.hasAccess}
                              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-300 outline-none focus:border-tide-400/50 disabled:opacity-40"
                            >
                              {DATA_SCOPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'security' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Select which security rules to run when testing this endpoint.
            </p>
            <SecurityRuleSelector value={selectedRules} onChange={onRulesChange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
