import { SecurityRuleSelector } from '../SecurityRuleSelector';
import { Input, TabBar, Textarea } from '../ui';
import type { RuleSelection } from '../../types/api';
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
  onTabChange: (tab: EndpointEditorTab) => void;
  onPathParamsChange: (params: Record<string, string>) => void;
  onQueryRowsChange: (rows: KVPair[]) => void;
  onHeaderRowsChange: (rows: KVPair[]) => void;
  onBodyTextChange: (bodyText: string) => void;
  onAuthTokenChange: (authToken: string) => void;
  onRulesChange: (rules: RuleSelection) => void;
}

export function EndpointRequestPanel({
  activeTab,
  detectedPathParams,
  pathParams,
  queryRows,
  headerRows,
  bodyText,
  authToken,
  selectedRules,
  onTabChange,
  onPathParamsChange,
  onQueryRowsChange,
  onHeaderRowsChange,
  onBodyTextChange,
  onAuthTokenChange,
  onRulesChange,
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
